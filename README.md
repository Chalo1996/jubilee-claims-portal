# Insurance Claims Processing Portal

[![CI](https://github.com/Chalo1996/jubilee-claims-portal/actions/workflows/ci.yml/badge.svg)](https://github.com/Chalo1996/jubilee-claims-portal/actions/workflows/ci.yml)

A full-stack insurance claims management system. Claims officers can submit, review, approve, reject, and mark claims as paid through an enforced status workflow.

**Live demo:** [https://jubilee-claims-portal-v2.vercel.app](https://jubilee-claims-portal-2.vercel.app)  
**Docker Hub:** [chaloemmanuel/jubilee-claims-backend](https://hub.docker.com/r/chaloemmanuel/jubilee-claims-backend) · [chaloemmanuel/jubilee-claims-frontend](https://hub.docker.com/r/chaloemmanuel/jubilee-claims-frontend)  
**Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/aws-architecture.svg](docs/aws-architecture.svg)

---

## Table of Contents

- [Quick Start (Local)](#quick-start-local)
- [Quick Start (Docker)](#quick-start-docker)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Claim Status Workflow](#claim-status-workflow)
- [Deploying to Vercel](#deploying-to-vercel)
- [Docker Hub Images](#docker-hub-images)
- [Architecture & Design Decisions](#architecture--design-decisions)

---

## Quick Start (Local)

**Requirements:** Node.js 20+, PostgreSQL 16

```bash
git clone https://github.com/Chalo1996/jubilee-claims-portal.git
cd jubilee-claims-portal

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — set DB_PASSWORD and JWT_SECRET

cd backend
npm install
node src/db/migrate.js
node src/db/seed.js
npm run dev
# API available at http://localhost:5000

# Frontend (new terminal)
cd ../frontend
npm install
npm run dev
# App available at http://localhost:3000
```

**Test credentials:**
```
Email:    officer@jubilee.co.ke
Password: Claims@2026
```

---

## Quick Start (Docker)

```bash
cp .env.example .env
# Set DB_PASSWORD and JWT_SECRET in .env

# Start all services (runs migrations automatically)
docker compose up --build

# Load sample data (first time only)
docker compose --profile seed up seed

# App: http://localhost
# API: http://localhost:5000
# DB:  localhost:5432
```

---

## Environment Variables

Copy `.env.example` to `.env` (root for Docker, `backend/.env` for local dev).

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `claims_portal` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | — | **Required.** Never commit. |
| `PORT` | `5000` | Backend port |
| `NODE_ENV` | `development` | `development` or `production` |
| `JWT_SECRET` | — | **Required.** Long random string. |
| `JWT_EXPIRES_IN` | `8h` | Token expiry |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin |
| `VITE_API_URL` | *(empty)* | Frontend API base; leave blank in dev (Vite proxy handles it) |

---

## Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE claims_portal;"

# Run idempotent migrations (safe to re-run)
cd backend && node src/db/migrate.js

# Load sample data (8 policies, 10 claims, 1 test user)
node src/db/seed.js
```

Schema overview:

| Table | Key fields |
|---|---|
| `users` | id, email, full_name, password_hash |
| `policies` | id, policy_number (UNIQUE), customer_name, policy_type, status |
| `claims` | id, claim_number (UNIQUE), policy_id (FK), claim_type, amount, incident_date, description, status |

All enum values are enforced at the database level. `updated_at` is managed automatically by a PostgreSQL trigger.

---

## API Reference

Base URL: `http://localhost:5000/api`  
All claims/policies endpoints require `Authorization: Bearer <token>`.

### Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Returns `{ token, user }` |
| `GET` | `/auth/me` | Returns current user from token |

**Login request:**
```json
{ "email": "officer@jubilee.co.ke", "password": "Claims@2026" }
```

### Claims

| Method | Path | Description |
|---|---|---|
| `GET` | `/claims` | Paginated list. Query: `page`, `limit`, `status`, `claim_type`, `search` |
| `POST` | `/claims` | Create claim (status forced to `SUBMITTED`) |
| `GET` | `/claims/:id` | Single claim + policy + `allowedTransitions[]` |
| `PATCH` | `/claims/:id/status` | Transition status; returns updated claim + new `allowedTransitions[]` |

**Create claim request:**
```json
{
  "policy_number": "POL-2026-001",
  "claim_type": "Motor",
  "amount": 250000,
  "incident_date": "2026-08-15",
  "description": "Vehicle damage following a rear-end collision on Thika Road."
}
```

### Policies

| Method | Path | Description |
|---|---|---|
| `GET` | `/policies` | List all policies (used by create-claim dropdown) |

### Error shape

```json
{ "error": "Human-readable message." }
```

Validation errors (422):
```json
{
  "error": "Validation failed.",
  "errors": [{ "field": "amount", "message": "amount must be a positive number." }]
}
```

| Code | Meaning |
|---|---|
| 401 | Missing or invalid JWT |
| 404 | Resource not found |
| 409 | Invalid status transition |
| 422 | Validation failure |
| 500 | Unexpected error (stack trace hidden in production) |

---

## Testing

```bash
cd backend
npm test               # run all tests
npm run test:coverage  # with coverage report
```

| Suite | File | Count |
|---|---|---|
| Status machine (unit) | `statusMachine.test.js` | 12 tests |
| Claims API (integration) | `claims.api.test.js` | 23 tests |

**Total: 35 tests, 0 failures.** The pg pool is mocked — no live database required in CI.

---

## Claim Status Workflow

```
SUBMITTED ──► UNDER_REVIEW ──► APPROVED ──► PAID
                          │
                          └──► REJECTED  (terminal)
```

The state machine in `backend/src/services/statusMachine.js` is the single source of truth. Invalid transitions return HTTP 409. The frontend only renders valid next-state options per claim.

---

## Deploying to Vercel

The frontend is configured for Vercel in `frontend/vercel.json`. The SPA rewrite rule and security headers are pre-configured.

**Option 1 — GitHub integration (recommended):**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `Chalo1996/jubilee-claims-portal`
3. Set **Root Directory** to `frontend`
4. Add environment variable: `VITE_API_URL` → your backend URL (e.g. `https://your-api.onrender.com/api`)
5. Deploy

**Option 2 — CLI:**

```bash
cd frontend
npx vercel --prod
# Follow the prompts; set VITE_API_URL when asked for environment variables
```

**Backend hosting options for the API** (Vercel only serves static/serverless):
- [Render](https://render.com) — free tier, Docker deploy from Docker Hub image `chaloemmanuel/jubilee-claims-backend:latest`
- [Railway](https://railway.app) — PostgreSQL + Node.js in one project
- [Fly.io](https://fly.io) — excellent Docker support, free allowance

For Render: create a Web Service → select "Deploy from Docker Hub" → image `chaloemmanuel/jubilee-claims-backend:latest` → add environment variables.

---

## Docker Hub Images

```bash
# Pull and run backend
docker pull chaloemmanuel/jubilee-claims-backend:latest
docker run -p 5000:5000 \
  -e DB_HOST=host.docker.internal \
  -e DB_NAME=claims_portal \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your_password \
  -e JWT_SECRET=your_secret \
  chaloemmanuel/jubilee-claims-backend:latest

# Pull frontend (nginx, proxies /api to backend)
docker pull chaloemmanuel/jubilee-claims-frontend:latest
```

| Image | Tags | Size |
|---|---|---|
| `chaloemmanuel/jubilee-claims-backend` | `latest`, `1.0.0` | ~58 MB |
| `chaloemmanuel/jubilee-claims-frontend` | `latest`, `1.0.0` | ~21 MB |

---

## Architecture & Design Decisions

Full documentation in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), including:

- Technology choices and alternatives considered
- Data model with indexes and constraints
- JWT authentication flow
- AWS production deployment strategy (ECS Fargate, Aurora PostgreSQL, SQS, S3, CloudFront, WAF)
- High availability and disaster recovery design
- What we would improve with more time
- Known limitations

AWS architecture diagram: [`docs/aws-architecture.svg`](docs/aws-architecture.svg)
