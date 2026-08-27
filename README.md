# Insurance Claims Processing Portal

A full-stack web application that allows claims officers to submit, review, and process insurance claims through a structured workflow.

Built as a technical interview exercise — demonstrating architecture decisions, API design, database modelling, frontend implementation, validation, security awareness, and testing.

---

## Table of Contents

- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Quick Start (Local)](#quick-start-local)
- [Quick Start (Docker)](#quick-start-docker)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Claim Status Workflow](#claim-status-workflow)
- [Assumptions](#assumptions)
- [Trade-offs and Known Limitations](#trade-offs-and-known-limitations)
- [How It Would Scale](#how-it-would-scale)
- [Security Notes](#security-notes)
- [What Was Left Out](#what-was-left-out)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│   React SPA (Vite + Tailwind)                           │
│   • Dashboard with search/filter/pagination             │
│   • Create claim form                                   │
│   • Claim detail + status update modal                  │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP (proxied via nginx/Vite)
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Node.js / Express API                      │
│   • Routes → Controllers → Services                     │
│   • express-validator for input validation              │
│   • Status machine for transition enforcement           │
│   • helmet + cors for security headers                  │
└───────────────────────┬─────────────────────────────────┘
                        │ pg (connection pool)
                        ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL 16                              │
│   • policies + claims tables                            │
│   • pg enums, FK constraints, check constraints         │
│   • Indexes on status, claim_number, policy_id          │
│   • updated_at auto-managed via trigger                 │
└─────────────────────────────────────────────────────────┘
```

**Separation of concerns:**

| Layer | Responsibility |
|---|---|
| Routes | HTTP method + path routing, validator chain |
| Controllers | HTTP request/response, delegates to service |
| Services | Business logic, all SQL queries |
| Status Machine | Single source of truth for transition rules |
| Validators | Input sanitisation and field-level validation |
| Middleware | Validation result collection, global error handler |

---

## Technology Stack

| Area | Choice | Reason |
|---|---|---|
| Frontend | React 18 + Vite | Fast dev builds, familiar ecosystem |
| Styling | Tailwind CSS | Utility-first, no context-switching, responsive by default |
| Routing | React Router v6 | Standard SPA routing |
| Backend | Node.js + Express | Lightweight, well-understood, fast prototyping |
| Validation | express-validator | Declarative, integrates cleanly with Express middleware chain |
| Database | PostgreSQL 16 | Relational integrity, native enums, JSONB if needed later |
| DB Client | node-postgres (pg) | Low-level, no ORM overhead, parameterised queries prevent SQL injection |
| Testing | Jest + Supertest | Widely adopted, supports mock-based integration tests without a live DB |
| Container | Docker + nginx | Reproducible environment; nginx handles SPA routing + API proxy |

---

## Project Structure

```
jubilee-claims-portal/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── pool.js          # pg connection pool
│   │   │   ├── migrate.js       # idempotent schema migration
│   │   │   └── seed.js          # sample data (8 policies, 10 claims)
│   │   ├── services/
│   │   │   ├── claimsService.js # all SQL + business logic
│   │   │   └── statusMachine.js # transition rules
│   │   ├── controllers/
│   │   │   └── claimsController.js
│   │   ├── routes/
│   │   │   ├── claims.js
│   │   │   └── policies.js
│   │   ├── validators/
│   │   │   └── claimValidators.js
│   │   ├── middleware/
│   │   │   ├── validate.js      # collects express-validator errors → 422
│   │   │   └── errorHandler.js  # global error handler
│   │   ├── tests/
│   │   │   ├── statusMachine.test.js  # pure unit tests
│   │   │   └── claims.api.test.js     # HTTP integration tests (pool mocked)
│   │   ├── app.js               # Express app factory (testable without port binding)
│   │   └── index.js             # Server entry point
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Route-level page components
│   │   ├── hooks/               # Data-fetching hooks
│   │   ├── services/            # API client (fetch wrapper)
│   │   └── utils/               # Formatters (currency, dates, status colours)
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.js
│   └── package.json
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Quick Start (Local)

### Prerequisites

- Node.js 20+
- PostgreSQL 16 running locally
- npm

### 1. Clone and configure

```bash
git clone <repo-url>
cd jubilee-claims-portal

# Copy and fill in the environment file
cp .env.example backend/.env
# Edit backend/.env with your DB credentials
```

### 2. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Create the database

```bash
# In psql or your preferred client:
CREATE DATABASE claims_portal;
```

### 4. Run migrations

```bash
cd backend
node src/db/migrate.js
```

### 5. Seed sample data

```bash
node src/db/seed.js
```

### 6. Start the backend

```bash
npm run dev        # uses nodemon for hot reload
# API available at http://localhost:5000
```

### 7. Start the frontend

```bash
cd ../frontend
npm run dev
# App available at http://localhost:3000
# /api/* requests are proxied to http://localhost:5000
```

---

## Quick Start (Docker)

### Prerequisites

- Docker Engine 24+
- Docker Compose v2

### 1. Configure

```bash
cp .env.example .env
# Set at minimum: DB_PASSWORD
```

### 2. Start all services

```bash
docker compose up --build
```

The `migrate` service runs automatically on first boot. To also load seed data:

```bash
docker compose --profile seed up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost |
| Backend API | http://localhost:5000 |
| PostgreSQL | localhost:5432 |

### 3. Stop

```bash
docker compose down
# To also remove the database volume:
docker compose down -v
```

---

## Environment Variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `DB_HOST` | `localhost` | Yes | PostgreSQL host |
| `DB_PORT` | `5432` | No | PostgreSQL port |
| `DB_NAME` | `claims_portal` | Yes | Database name |
| `DB_USER` | `postgres` | Yes | Database user |
| `DB_PASSWORD` | — | **Yes** | Database password (never commit) |
| `PORT` | `5000` | No | Backend port |
| `NODE_ENV` | `development` | No | `development` or `production` |
| `CORS_ORIGIN` | `http://localhost:3000` | No | Allowed frontend origin |
| `VITE_API_URL` | `/api` | No | Frontend API base URL (build time) |

---

## Database Setup

### Schema

```sql
-- Enum types (claim_status, claim_type, policy_type, policy_status)
-- policies: id (UUID PK), policy_number (UNIQUE), customer_name, policy_type, status, timestamps
-- claims:   id (UUID PK), claim_number (UNIQUE), policy_id (FK), claim_type,
--           amount (NUMERIC > 0), incident_date, description, status, timestamps

-- Indexes
idx_claims_status          -- fast status filtering
idx_claims_claim_number    -- claim number lookups
idx_claims_policy_id       -- join performance
idx_claims_status_created  -- composite for dashboard (status + recency)
idx_policies_customer_name -- search by customer name
```

### Relationships

- One **Policy** → many **Claims** (`claims.policy_id` FK with `ON DELETE RESTRICT`)
- The FK prevents orphaned claims; deleting a policy that has claims is blocked at the DB level.

### Migrations

Idempotent — safe to re-run. Uses `CREATE TABLE IF NOT EXISTS` and `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL END $$` for enum types.

```bash
node src/db/migrate.js
```

### Seed data

8 policies, 10 claims across all status states and claim types. Uses `ON CONFLICT DO NOTHING` so re-running is safe.

```bash
node src/db/seed.js
```

---

## API Reference

Base URL: `http://localhost:5000/api`

### List Claims

```
GET /claims
```

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page, max 100 (default: 10) |
| `status` | string | Filter by status |
| `claim_type` | string | Filter by claim type |
| `search` | string | Search claim #, policy #, customer name (ILIKE) |

**Response:**
```json
{
  "data": [ { ...claim fields + policy fields } ],
  "pagination": { "total": 10, "page": 1, "limit": 10, "totalPages": 1 }
}
```

---

### Get Claim

```
GET /claims/:id
```

Returns full claim + policy details + `allowedTransitions[]` for the UI.

---

### Create Claim

```
POST /claims
```

**Body:**
```json
{
  "policy_number": "POL-2026-001",
  "claim_type":    "Motor",
  "amount":        250000,
  "incident_date": "2026-08-15",
  "description":   "Vehicle damage following an accident."
}
```

- `claim_number` is auto-generated as `CLM-{YEAR}-{NNNN}`
- Initial status is always `SUBMITTED`

---

### Update Claim Status

```
PATCH /claims/:id/status
```

**Body:**
```json
{ "status": "UNDER_REVIEW" }
```

Returns updated claim + new `allowedTransitions[]`.

---

### List Policies

```
GET /policies
```

Returns all policies. Used by the frontend create-claim dropdown.

---

### Health Check

```
GET /health
```

Returns `{ "status": "ok" }`.

---

### Error Responses

All errors return a consistent JSON body:

```json
{ "error": "Human-readable message." }
```

Validation errors (422) include field detail:

```json
{
  "error": "Validation failed.",
  "errors": [
    { "field": "amount", "message": "amount must be a positive number." }
  ]
}
```

| Status | Meaning |
|---|---|
| 400 | Bad request |
| 404 | Resource not found |
| 409 | Invalid status transition (or conflict) |
| 422 | Validation failure |
| 500 | Unexpected server error (stack trace never exposed in production) |

---

## Testing

```bash
cd backend

# Run all tests
npm test

# With coverage report
npm run test:coverage
```

**Test suites:**

| Suite | File | Tests |
|---|---|---|
| Status Machine (unit) | `statusMachine.test.js` | 12 tests — all valid/invalid transitions, terminal states, `getAllowedTransitions` |
| Claims API (integration) | `claims.api.test.js` | 22 tests — create, list, get, status update; valid + invalid inputs; DB mocked via `jest.mock` |

**Total: 34 tests, all passing.**

The DB pool is mocked so tests run in CI without a live PostgreSQL instance.

---

## Claim Status Workflow

```
SUBMITTED ──► UNDER_REVIEW ──► APPROVED ──► PAID
                         │
                         └──► REJECTED
```

- **SUBMITTED** — new claim, awaiting review
- **UNDER_REVIEW** — claims officer is actively reviewing
- **APPROVED** — approved for payment
- **REJECTED** — denied (terminal)
- **PAID** — payment issued (terminal)

The state machine (`src/services/statusMachine.js`) is the single source of truth. The API enforces it on every `PATCH /claims/:id/status` request, and the frontend only renders the valid next-state options for a given claim.

---

## Assumptions

1. **No authentication** — all claims officers share unrestricted access. JWT auth is documented as an optional enhancement.
2. **Claim number is auto-generated** — format `CLM-{YEAR}-{sequence}`. The sequence is derived from a COUNT query (not a DB sequence), which is acceptable for this exercise but would need to be a proper DB sequence in production to handle concurrent inserts correctly.
3. **All monetary amounts are in KES** — no multi-currency support.
4. **Policies are pre-loaded** — policies are seeded and not created through the portal. A policy management module would exist in the real system.
5. **No soft-delete** — claims can only be status-transitioned; there is no delete endpoint.
6. **The frontend policy dropdown** loads all policies. With thousands of policies a typeahead/autocomplete would be more appropriate.

---

## Trade-offs and Known Limitations

| Trade-off | Decision | Production alternative |
|---|---|---|
| No auth | Skipped for time — not in core requirements | JWT middleware + role-based access (Claims Officer / Manager) |
| COUNT-based claim numbers | Simple and readable for demo data | DB `SEQUENCE` or UUID with formatted display |
| Mock-based integration tests | No live DB required in CI | TestContainers for a real DB in CI |
| No audit log | Status changes are not attributed to a user | Add `audit_log` table: `claim_id, from_status, to_status, changed_by, changed_at` |
| No optimistic locking | Two officers could update the same claim simultaneously | Add `version` column + `WHERE version = $expected` check on update |
| No file attachments | Claims have no supporting document upload | S3 + presigned URLs |
| No background jobs | No async notification on status change | BullMQ / SQS + SNS for email/SMS notifications |
| SQLite not used | PostgreSQL even for dev | Docker makes this straightforward; SQLite would weaken the schema (no enums/FK enforcement) |

---

## How It Would Scale

**Database:**
- The composite index `(status, created_at DESC)` keeps the dashboard query fast even with 100k+ claims.
- Add read replicas for reporting queries.
- Partition the `claims` table by year for very large datasets.
- Move to connection pooling middleware (PgBouncer) in front of PostgreSQL when the app scales horizontally.

**API:**
- The Express app is stateless — horizontal scaling behind a load balancer requires only shared DB and no in-process state.
- Introduce Redis for caching the `GET /policies` list (changes infrequently).
- Rate-limit the API per IP/user using `express-rate-limit`.

**Frontend:**
- The current `useClaims` hook re-fetches on every filter change. Add debounce on the search input.
- Add React Query for stale-while-revalidate caching and background refetching.

**Operations:**
- Add structured logging (Pino/Winston) and ship to CloudWatch Logs or Datadog.
- Add an OpenAPI / Swagger spec for client codegen and documentation.
- Add a CI pipeline (GitHub Actions): lint → test → Docker build → push to ECR → deploy to ECS/EKS.

---

## Security Notes

- All SQL queries use parameterised values (`$1`, `$2`…) via `node-postgres` — no string concatenation.
- `helmet` sets secure HTTP response headers (CSP, X-Frame-Options, etc).
- `express.json({ limit: '100kb' })` prevents oversized payload attacks.
- Stack traces are never returned to the client in production (`NODE_ENV=production`).
- Credentials are read from environment variables; `.env` is in `.gitignore`.
- The Docker backend runs as a non-root user (`appuser`).
- CORS is restricted to the configured `CORS_ORIGIN`.

---

## What Was Left Out

The following optional enhancements from the spec were intentionally deferred to stay within the time budget:

- **JWT authentication** — would add `users` table + `POST /auth/login` + Bearer token middleware
- **Audit trail** — `audit_log` table recording every status change with actor and timestamp
- **Optimistic locking** — `version` column on claims to prevent concurrent update conflicts
- **OpenAPI / Swagger** — `swagger-jsdoc` + `swagger-ui-express` for self-documenting API
- **Dashboard metrics** — aggregate counts (total, by status, total approved amount) via a single SQL query
- **Background notifications** — email/SMS on approval/rejection using SQS + SNS or BullMQ
- **CI pipeline** — GitHub Actions workflow for lint → test → build → push

Each of these is well-understood and would follow conventional patterns. Architecture and integration points have been designed to accommodate them without structural changes.
