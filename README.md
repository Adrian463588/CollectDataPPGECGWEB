# Experiment Controller

Experiment orchestration system for an early stress detection study. Manages experiment timelines, delivers stimuli (TSST Mental Arithmetic), and logs all events with millisecond-precise timestamps in WIB (UTC+7).

## Architecture

| Component | Stack | Details |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind + Framer Motion | Runs locally on port 3000. Uses an `/api-proxy` to solve CORS. |
| Backend | Go + `chi` router + `pgx` | Runs locally on port 8081. |
| Database | PostgreSQL 16 | Runs locally on port 5432 (native installation, NO DOCKER). |

**Note**: All Docker functionality has been completely removed to provide a simplified, native local development workflow for Windows.

## Quick Start (Local Setup)

### Prerequisites

- Node.js ≥ 18
- Go ≥ 1.21
- PostgreSQL (natively installed, running on `localhost:5432`)
- `make` utility installed on your Windows path.

### 1. Database Setup & Reset

Ensure your local PostgreSQL is running and you can authenticate natively as user `postgres`. To drop the existing database, completely recreate it, and apply all migrations, run:

```bash
make db-reset
```

*(This executes the combined schema script at `backend/migrations/all.sql` directly using `psql`)*

### 2. Start Both Services

To launch both the Go backend and Next.js frontend concurrently via `make`:

```bash
make dev
```
- The backend will start on `http://localhost:8081`
- The frontend will start on `http://localhost:3000`

Open [http://localhost:3000](http://localhost:3000) or [http://192.168.56.1:3000](http://192.168.56.1:3000) (if testing over LAN).

## Makefile Commands Reference

| Command | Action |
|---|---|
| `make dev` | Starts both backend and frontend concurrently |
| `make dev-backend` | Starts only the Go backend |
| `make dev-frontend` | Starts only the Next.js frontend |
| `make db-reset` | Terminates active connections, drops, recreates, and migrates the local DB |
| `make migrate` | Applies `all.sql` to the existing local DB |
| `make test` | Runs both backend and frontend unit tests |
| `make build-backend`| Builds the Go server into an executable `main.exe` |
| `make build-frontend`| Packages the Next.js application |
| `make clean` | Removes `node_modules`, `.next` folder, and `main.exe` |

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

Admin endpoints require the `X-Admin-Key` header.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8081` | Server port |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/expctrl?sslmode=disable` | PostgreSQL connection |
| `ADMIN_API_KEY` | `test123` | Admin auth key |
| `CORS_ORIGINS` | `http://localhost:3000,http://192.168.56.1:3000` | Allowed origins |
| `TZ` | `Asia/Jakarta` | Timezone |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL (Proxied to `/api-proxy`) |
| `BACKEND_URL` | Server-side Backend location (`http://localhost:8081`) |

## License

Private — research use only.