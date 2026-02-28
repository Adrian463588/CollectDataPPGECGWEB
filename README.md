# Experiment Controller

Experiment orchestration system for an early stress detection study. Manages experiment timelines, delivers stimuli (TSST Mental Arithmetic), and logs all events with millisecond-precise timestamps in WIB (UTC+7).

## Architecture

| Component | Stack | Deploy |
|---|---|---|
| Frontend | Next.js + TypeScript + Tailwind + Framer Motion | Tencent EdgeOne |
| Backend | Go + PostgreSQL | Azure / Heroku |
| Database | PostgreSQL 16 | Managed (Azure/Heroku) |

## Quick Start

### Prerequisites

- Node.js ≥ 18
- Go ≥ 1.21
- Docker + Docker Compose

### 1. Start Database

```bash
docker compose up -d postgres
```

### 2. Start Backend

```bash
cd backend
cp .env.example .env
go run ./cmd/server
```

### 3. Start Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### One-Command Dev

```bash
make dev
```

### Run Migrations

Migrations are auto-applied via `docker-entrypoint-initdb.d`. For manual runs:

```bash
make migrate
```

### Run Tests

```bash
make test
```

## Experiment Flow

```
Consent → Device Check → Countdown (5s) → Relaxation (5min) → Stress / Math (5min) → Complete
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/participants` | Create participant |
| `GET` | `/api/participants/:code` | Get participant |
| `POST` | `/api/sessions` | Create session |
| `GET` | `/api/sessions/:id` | Get session state |
| `POST` | `/api/sessions/:id/transition` | Transition phase |
| `POST` | `/api/sessions/:id/heartbeat` | Send heartbeat |
| `POST` | `/api/sessions/:id/events` | Batch log events |
| `GET` | `/api/admin/sessions` | List all sessions |
| `GET` | `/api/admin/export/sessions/:id/events.csv` | Export events CSV |
| `GET` | `/api/admin/export/all/sessions.csv` | Bulk export CSV |

Admin endpoints require `X-Admin-Key` header.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Server port |
| `DATABASE_URL` | `postgres://...` | PostgreSQL connection |
| `ADMIN_API_KEY` | — | Admin auth key |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed origins |
| `TZ` | `Asia/Jakarta` | Timezone |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_APP_NAME` | App display name |

## Deployment

### Frontend → Tencent EdgeOne

```bash
cd frontend && npm run build
# Upload .next/ output to EdgeOne
```

### Backend → Azure

```bash
cd backend
GOOS=linux GOARCH=amd64 go build -o server ./cmd/server
az webapp up --name experiment-controller-api
```

### Backend → Heroku

```bash
heroku create experiment-controller-api
heroku addons:create heroku-postgresql:essential-0
git subtree push --prefix backend heroku main
```

## License

Private — research use only.