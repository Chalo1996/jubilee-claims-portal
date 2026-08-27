# Architecture & Engineering Decisions

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Choices](#technology-choices)
3. [Data Model](#data-model)
4. [API Design](#api-design)
5. [Authentication](#authentication)
6. [Claim Status Workflow](#claim-status-workflow)
7. [Current Deployment (Docker)](#current-deployment-docker)
8. [AWS Production Deployment Strategy](#aws-production-deployment-strategy)
   - [Infrastructure Overview](#infrastructure-overview)
   - [Compute](#compute)
   - [Database](#database)
   - [Caching](#caching)
   - [Message Queue](#message-queue)
   - [Document Storage](#document-storage)
   - [CDN and Static Assets](#cdn-and-static-assets)
   - [Security](#security)
   - [Observability](#observability)
   - [CI/CD Pipeline](#cicd-pipeline)
   - [High Availability and Redundancy](#high-availability-and-redundancy)
   - [Disaster Recovery](#disaster-recovery)
9. [What We Would Improve](#what-we-would-improve)
10. [Known Limitations](#known-limitations)

---

## System Overview

The Jubilee Claims Processing Portal is a multi-tier web application with three logical layers:

```
React SPA (Vite + Tailwind)
        ↕  HTTPS / JWT Bearer
Node.js / Express REST API
        ↕  pg connection pool
PostgreSQL (claims + policies + users)
```

The frontend is a single-page application served from a CDN or nginx. All data flows through the REST API, which enforces authentication and business rules before touching the database. The state machine is the single source of truth for claim lifecycle transitions.

See `docs/aws-architecture.svg` for the full production topology.

---

## Technology Choices

### Backend: Node.js + Express

Express was chosen for its minimal surface area and high npm ecosystem compatibility. For a team already comfortable in JavaScript, a unified language across the stack reduces context switching. The application is I/O-bound (database queries, future external integrations), where Node's event loop model performs well. NestJS was considered but rejected — its structured DI system adds overhead not justified for this scope.

**Alternatives considered:**

| Option | Reason not chosen |
|---|---|
| NestJS | Opinionated DI adds complexity for an MVP; harder to read for unfamiliar reviewers |
| Python / Django | Slightly higher latency for I/O-heavy workloads; separate language from frontend |
| Go / Gin | Excellent performance, but longer implementation time and narrower hiring pool |

### Database: PostgreSQL 16

The claims domain is inherently relational: a claim belongs to a policy, and the status workflow has strict ordering rules. PostgreSQL's native enum types enforce claim status and type values at the database layer, making invalid states impossible regardless of application bugs. Foreign key constraints with `ON DELETE RESTRICT` prevent orphaned claims. The `NUMERIC(15,2)` type for amounts avoids floating-point precision issues common with `FLOAT`.

Aurora PostgreSQL would be the production choice — it provides automatic Multi-AZ failover, up to 15 read replicas, and storage auto-scaling with no manual intervention.

**Why not NoSQL?** The structured relationships between claims and policies, combined with the need for transactional status updates and financial amount accuracy, favour a relational model.

### Frontend: React 18 + Vite + Tailwind CSS v4

React is the dominant choice in the Kenyan fintech frontend ecosystem, ensuring maintainability by future hires. Vite provides sub-second HMR in development and a fast production build using Rolldown. Tailwind v4 removes the config file overhead and integrates directly as a Vite plugin — the entire styling system is co-located with components.

React Router v6 handles client-side routing with protected route wrappers. Context API (not Redux) is sufficient for the single shared concern of authentication state.

### Authentication: JWT (jsonwebtoken + bcryptjs)

Stateless JWT tokens suit a horizontally scaled API — no session store is needed. Tokens are signed with a secret stored in environment variables (Secrets Manager in production), have an 8-hour expiry, and carry only non-sensitive claims (user ID, email, name). bcryptjs with cost factor 12 provides adequate password hashing security.

**Production improvement:** Rotate to asymmetric RS256 keys so the frontend (or third-party services) can verify tokens without access to the signing secret.

### Containerisation: Docker + Docker Compose

Multi-stage Dockerfiles keep production images minimal. The backend runs as a non-root user (`appuser`) — if the container is compromised, the attacker cannot write to most of the filesystem. The frontend is served by nginx, which handles gzip compression, SPA routing fallback, and proxies `/api/*` to the backend service without an additional reverse proxy tier.

### Testing: Jest + Supertest

The pg pool is mocked via `jest.mock` so integration tests run without a live database, making them suitable for CI environments with no infrastructure dependencies. The status machine has pure unit tests since it is the most business-critical component with no external dependencies.

---

## Data Model

```
users
  id            UUID PK
  email         VARCHAR(255) UNIQUE
  full_name     VARCHAR(255)
  password_hash VARCHAR(255)
  created_at    TIMESTAMPTZ

policies
  id            UUID PK
  policy_number VARCHAR(50) UNIQUE
  customer_name VARCHAR(255)
  policy_type   ENUM(Motor, Health, Travel, Property, Other)
  status        ENUM(ACTIVE, EXPIRED, CANCELLED)
  created_at    TIMESTAMPTZ
  updated_at    TIMESTAMPTZ  ← managed by trigger

claims
  id            UUID PK
  claim_number  VARCHAR(50) UNIQUE
  policy_id     UUID FK → policies(id) ON DELETE RESTRICT
  claim_type    ENUM(Motor, Health, Travel, Property, Other)
  amount        NUMERIC(15,2) CHECK (amount > 0)
  incident_date DATE
  description   TEXT
  status        ENUM(SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, PAID)
  created_at    TIMESTAMPTZ
  updated_at    TIMESTAMPTZ  ← managed by trigger
```

**Indexes:**

| Index | Purpose |
|---|---|
| `idx_claims_status` | Status filter on dashboard |
| `idx_claims_status_created` | Composite — status + recency sort (most common dashboard query) |
| `idx_claims_policy_id` | JOIN performance |
| `idx_claims_claim_number` | Unique lookup and search |
| `idx_policies_customer_name` | ILIKE search |

UUIDs are used as primary keys to prevent enumeration attacks and support future distributed ID generation.

---

## API Design

All endpoints follow REST conventions. Errors always return a JSON body — never an HTML error page.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Returns JWT + user object |
| `GET` | `/api/auth/me` | Required | Returns current user from token |
| `GET` | `/api/claims` | Required | Paginated list; supports `status`, `claim_type`, `search`, `page`, `limit` |
| `POST` | `/api/claims` | Required | Create claim; status forced to `SUBMITTED` |
| `GET` | `/api/claims/:id` | Required | Single claim + policy + `allowedTransitions[]` |
| `PATCH` | `/api/claims/:id/status` | Required | Transition status; enforced by state machine |
| `GET` | `/api/policies` | Required | List policies (for create-claim dropdown) |
| `GET` | `/health` | Public | Liveness probe for load balancers |

**Status code semantics:**

| Code | Meaning |
|---|---|
| 200 / 201 | Success |
| 400 | Malformed request body |
| 401 | Missing or invalid JWT |
| 404 | Resource not found |
| 409 | Invalid status transition |
| 422 | Validation failure (field errors included) |
| 500 | Unexpected server error (stack trace hidden in production) |

---

## Authentication

The login flow:

1. Client POSTs `{ email, password }` to `/api/auth/login`
2. Server looks up user by email, compares bcrypt hash
3. On success: returns `{ token, user: { id, email, name } }`
4. Client stores token in `localStorage`, includes `Authorization: Bearer <token>` on all subsequent requests
5. `requireAuth` middleware verifies the JWT signature and attaches `req.user`
6. On 401 response, the frontend dispatches an `auth:expired` DOM event, `AuthContext` clears storage and redirects to `/login`

**Test credentials:**
```
Email:    officer@jubilee.co.ke
Password: Claims@2026
```

---

## Claim Status Workflow

```
SUBMITTED ──► UNDER_REVIEW ──► APPROVED ──► PAID
                          │
                          └──► REJECTED (terminal)
```

The state machine in `src/services/statusMachine.js` is the single authoritative source for valid transitions. It is consumed by the service layer (enforcement), the controller (appending `allowedTransitions` to API responses), and tests (verification). The frontend only renders the valid next-state options for each claim.

Attempting an invalid transition returns HTTP 409 with a message identifying the current status and the allowed next states.

---

## Current Deployment (Docker)

```bash
# Copy environment file and set required values
cp .env.example .env

# Start all services (DB auto-migrates on first boot)
docker compose up --build

# Load sample data
docker compose --profile seed up

# Run backend tests
cd backend && npm test
```

Services and ports:

| Service | Port | Notes |
|---|---|---|
| Frontend (nginx) | 80 | Serves SPA + proxies `/api/*` to backend |
| Backend API | 5000 | Express; protected by JWT |
| PostgreSQL | 5432 | Exposed for local tooling only |

---

## AWS Production Deployment Strategy

See `docs/aws-architecture.svg` for the visual diagram.

### Infrastructure Overview

The application is deployed across two availability zones (us-east-1a and us-east-1b) within a single VPC. Resources are segmented into:

- **Public subnets**: Application Load Balancer, NAT Gateways
- **Private app subnets**: ECS Fargate tasks, API Gateway (optional)
- **Private data subnets**: Aurora PostgreSQL, ElastiCache Redis, SQS queues

All inter-service communication is private. Only the ALB is internet-facing.

### Compute

**ECS Fargate** runs the Node.js API as stateless containers. Fargate eliminates EC2 instance management — AWS handles patching, placement, and capacity. Each task is defined with:

- 0.25 vCPU / 512 MB for baseline load
- Auto-scaling policy: scale out when average CPU exceeds 60%, scale in after 10 minutes below 40%
- Minimum 2 tasks running (one per AZ) for zero-downtime deployments
- Rolling deployment strategy with minimum healthy percent 100%

Environment variables (DB password, JWT secret) are injected at task start from **AWS Secrets Manager**, never baked into the Docker image.

**ECR** stores Docker images. Image scanning is enabled; images with CRITICAL vulnerabilities are blocked from deployment by the CI pipeline.

### Database

**Amazon Aurora PostgreSQL** replaces self-managed RDS:

- 1 writer instance + 1 reader replica across AZs
- Automated failover in under 30 seconds if the writer becomes unavailable
- Storage auto-scales from 10 GB to 128 TB without downtime
- Automated daily snapshots with 7-day retention
- Encryption at rest using a customer-managed KMS key

The application connects to the **writer endpoint** for mutations and the **reader endpoint** for `GET /api/claims` list queries, reducing load on the primary.

Connection pooling via **RDS Proxy** (optional at scale) eliminates connection storms during traffic spikes by maintaining a warm pool of connections to the database.

### Caching

**ElastiCache Redis** (cache.t4g.micro, primary + replica) serves two purposes:

1. **Reference data**: `GET /api/policies` responses are cached for 5 minutes. Policies change infrequently; the cache reduces database load and improves dashboard load time.
2. **Session rate limiting**: Redis stores per-user request counts for API throttling, preventing a single user from flooding the system.

### Message Queue

**Amazon SQS** decouples claim status change events from the main request path. When a claim is moved to APPROVED, REJECTED, or PAID, the API publishes a message to the `claim-status-changes` standard queue. A **Lambda function** consumes the queue and:

- Sends a personalised email via **SES** on APPROVED/REJECTED
- Sends an SMS notification via **SNS** on PAID

A **Dead Letter Queue (DLQ)** captures messages that fail after 3 delivery attempts. A CloudWatch alarm fires if the DLQ depth exceeds 0, triggering an alert to the on-call engineer.

This design means a failure in the notification system never blocks the claims officer from updating a status — the two concerns are fully independent.

### Document Storage

Supporting documents (photos, reports, invoices) are stored in **S3**, never on application servers:

1. Client requests a presigned PUT URL from the API (60-second expiry)
2. Client uploads the file directly to S3 — the file never passes through the backend
3. An S3 event notification triggers a Lambda that records document metadata (key, size, MIME type) in the `claim_documents` table
4. Retrieval uses presigned GET URLs (15-minute expiry) — files are not publicly accessible

Bucket configuration:
- Public access blocked at account level
- SSE-KMS encryption for all objects
- Versioning enabled (supports accidental deletion recovery)
- Lifecycle policy: transition to S3 Glacier after 1 year, delete after 7 years (regulatory compliance)

### CDN and Static Assets

The React SPA is built to `dist/` and uploaded to an **S3 bucket** configured for static website hosting. **CloudFront** sits in front:

- Edge caches `index.html` with a short TTL (60 seconds) so deployments propagate quickly
- Static assets (`/assets/*.js`, `*.css`) cached indefinitely (content-hashed filenames ensure cache busting on deploy)
- **WAF** rules attached to the CloudFront distribution block SQL injection, XSS, and known bad IPs
- **ACM certificate** provides HTTPS at no additional cost

API calls from the SPA hit the ALB directly (or via CloudFront using a second origin behaviour for `/api/*`).

### Security

| Control | Implementation |
|---|---|
| Network isolation | ALB in public subnet; ECS tasks and DB in private subnets; no direct internet access |
| Secret management | JWT secret and DB password in Secrets Manager; rotated on schedule |
| Encryption in transit | TLS 1.2+ enforced on ALB, CloudFront, and RDS connections |
| Encryption at rest | KMS CMK for RDS, S3, and CloudWatch Logs |
| Identity | IAM roles with least-privilege policies; no long-lived access keys |
| Application | helmet.js headers; parameterised SQL; payload size limits; CORS restricted to known origins |
| Threat detection | GuardDuty enabled; Security Hub aggregates findings; WAF on ALB and CloudFront |
| Patch management | ECR image scanning on push; automatic minor OS updates in Fargate |

### Observability

- **CloudWatch Logs**: ECS task stdout/stderr streamed to log groups; 90-day retention
- **CloudWatch Metrics**: custom metrics for claims created per hour, status transitions, and queue depth
- **CloudWatch Alarms**: p95 API latency > 1s, error rate > 1%, DLQ depth > 0, DB connections > 80%
- **X-Ray tracing**: enabled on ECS tasks to trace slow API paths through the DB layer
- **Dashboard**: single pane showing error rate, request volume, queue depth, RDS replication lag

### CI/CD Pipeline

GitHub Actions workflow triggered on push to `main`:

```
1. npm ci + npm test (Jest, 35 tests)
2. docker build --tag ecr-repo/claims-portal/backend:$SHA
3. docker build --tag ecr-repo/claims-portal/frontend:$SHA
4. Push to ECR (authenticated via OIDC, no long-lived credentials)
5. Run DB migrations (ECS task override, one-shot)
6. Update ECS service → rolling deployment
7. Wait for ECS stabilisation
8. Smoke test: curl /health on new task IP
9. Notify Slack on success/failure
```

The pipeline never uses long-lived AWS access keys. OIDC federation allows GitHub Actions to assume an IAM role scoped to only the permissions needed for the pipeline.

### High Availability and Redundancy

| Component | HA Mechanism |
|---|---|
| ECS tasks | Minimum 2 tasks across 2 AZs; ALB distributes traffic |
| Aurora DB | Multi-AZ with automatic failover < 30s |
| ElastiCache | Primary + replica; automatic failover |
| NAT Gateway | One per AZ (not shared) to avoid AZ-level single point of failure |
| Route 53 | Health checks failover DNS to secondary region if primary ALB is unhealthy |
| S3 / SQS | AWS-managed multi-AZ durability (11 nines) |

### Disaster Recovery

| Metric | Target | Mechanism |
|---|---|---|
| RTO (Recovery Time Objective) | 30 minutes | Route 53 failover + Aurora standby promotion |
| RPO (Recovery Point Objective) | 24 hours | Aurora daily automated snapshots |
| Backup retention | 7 days | RDS + S3 versioning |
| Cross-region copy | Weekly | Aurora snapshot copy to us-west-2 |

---

## What We Would Improve

### Short term (next sprint)

- **Audit log**: add `claim_status_history` table recording `(claim_id, from_status, to_status, changed_by, changed_at)`. Every status change writes a row. Exposes via `GET /api/claims/:id/history`.
- **Optimistic locking**: add `version INTEGER` column to `claims`. The `PATCH /status` endpoint includes `WHERE id = $1 AND version = $2`, incrementing on each update. Returns 409 if another officer changed the claim concurrently.
- **Refresh tokens**: current JWTs are valid for 8 hours. Short-lived access tokens (15 min) with a separate refresh token flow would improve security.
- **Claim number generation**: replace the COUNT-based sequence with a PostgreSQL `SEQUENCE` to handle concurrent inserts safely.

### Medium term

- **Role-based access control**: differentiate Claims Officer (can review/approve) from Manager (can override rejections, view reports) and Customer (read-only, own claims).
- **OpenAPI / Swagger**: auto-generate from route definitions using `swagger-jsdoc`. Enables client SDK generation and makes the API self-documenting.
- **Background job worker**: move async operations (notifications, document processing) to a dedicated BullMQ worker service with Redis as the broker, replacing the Lambda-per-event model with something easier to test locally.
- **Dashboard metrics**: aggregate query returning `{ total, by_status: {...}, total_approved_amount, avg_processing_days }`.

### Long term

- **Multi-tenancy**: partition data by insurer/branch using row-level security in PostgreSQL. Currently all data is shared.
- **Event sourcing**: store claims as an immutable event log (`ClaimCreated`, `StatusChanged`, `DocumentAttached`) and project the current state. Provides a perfect audit trail and supports replaying history.
- **GraphQL layer**: a GraphQL API over the existing service layer would let the frontend request exactly the fields it needs, reducing over-fetching on the dashboard.

---

## Known Limitations

1. **Claim number sequencing**: the current `COUNT(*) + 1` approach is not atomic. Two concurrent inserts within the same second could generate a duplicate claim number. The `UNIQUE` constraint will catch this and return a 500, but the user would need to retry. Fix: use `nextval('claim_number_seq')`.

2. **No file attachment support**: the claim entity has no supporting document capability. The architecture section documents the S3 presigned URL approach for production.

3. **Single-region**: the Docker Compose and initial AWS design is single-region. Cross-region active-passive requires Aurora global databases and Route 53 latency-based routing.

4. **No account lockout**: the login endpoint has no brute-force protection. Production requires either rate limiting (express-rate-limit) or Cognito, which handles lockout, MFA, and password policies automatically.

5. **localStorage for tokens**: storing JWT in localStorage is vulnerable to XSS. The production recommendation is httpOnly cookies with SameSite=Strict, which are inaccessible to JavaScript.
