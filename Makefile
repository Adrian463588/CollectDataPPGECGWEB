.PHONY: dev dev-backend dev-frontend migrate db-reset test test-backend test-frontend test-e2e test-e2e-open build-backend build-frontend clean

# ============================================================
# Development
# ============================================================

# Start backend and frontend concurrently (Windows).
dev:
	@echo "Starting backend..."
	@start /B cmd /C "cd backend && go run ./cmd/server"
	@echo "Starting frontend..."
	@cd frontend && npm run dev

dev-backend:
	cd backend && go run ./cmd/server

dev-frontend:
	cd frontend && npm run dev

# ============================================================
# Database  (requires psql on PATH, targeting local PostgreSQL)
# ============================================================

# Apply all migrations to the existing database.
migrate:
	psql -U postgres -d expctrl -f backend/migrations/all.sql

# Drop, recreate, and migrate the database (full reset).
db-reset:
	psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'expctrl' AND pid <> pg_backend_pid();"
	psql -U postgres -c "DROP DATABASE IF EXISTS expctrl;"
	psql -U postgres -c "CREATE DATABASE expctrl;"
	psql -U postgres -d expctrl -f backend/migrations/all.sql
	@echo "Database reset complete."

# ============================================================
# Testing
# ============================================================

test: test-backend test-frontend

test-backend:
	cd backend && go test ./...

test-frontend:
	cd frontend && npm test -- --watchAll=false

test-e2e:
	cd frontend && npx cypress run

test-e2e-open:
	cd frontend && npx cypress open

# ============================================================
# Build
# ============================================================

build-backend:
	cd backend && go build -o main.exe ./cmd/server

build-frontend:
	cd frontend && npm run build

# ============================================================
# Cleanup
# ============================================================

clean:
	cd frontend && if exist .next rmdir /s /q .next
	cd frontend && if exist node_modules rmdir /s /q node_modules
	cd backend  && if exist main.exe del main.exe
