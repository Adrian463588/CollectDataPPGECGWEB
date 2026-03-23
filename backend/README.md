# Experiment Controller API Server (Backend)

The backend is a Go application using the `chi` router and `pgx` for PostgreSQL access. It provides endpoints for creating sessions, logging high-frequency events, and validating phases for the stress detection experiment.

## Architecture & Database

This project uses a standard multi-layer architecture consisting of `handler`, `service`, and `store` layers.

The database is a local PostgreSQL instance.

## Quick Start (Local Setup)

The backend is meant to be run directly on your host machine without Docker. Make sure you have Go installed (≥ 1.21).

1. **Environment Setup**
    Ensure your PostgreSQL is running locally on port 5432 with default credentials (`postgres`/`postgres`).

2. **Database Reset**
    If this is your first time, or if you want to reset the database, run the following from the root directory:
    ```bash
    make db-reset
    ```
    This drops the `expctrl` database, recreates it, and runs all migrations defined in `backend/migrations/all.sql`.

3. **Run the Backend**
    To run the backend independently (from the root directory):
    ```bash
    make dev-backend
    ```
    Or, you can start both frontend and backend concurrently:
    ```bash
    make dev
    ```

## Running Tests

Run all backend tests:
```bash
make test-backend
```

## Migration Files

Migrations are combined into a single file for easy local reset via `psql`:
- `migrations/all.sql` — contains all schema creation logic for tables (`participants`, `sessions`, `events`, `stimuli`, `responses`, `researcher_notes`) and indices.

## Environment Variables
The application relies on `backend/.env`. Example properties include:
- `PORT` (default `8081`)
- `DATABASE_URL` (default `postgres://postgres:postgres@localhost:5432/expctrl?sslmode=disable`)
- `CORS_ORIGINS` (default `http://localhost:3000,http://192.168.56.1:3000`)
