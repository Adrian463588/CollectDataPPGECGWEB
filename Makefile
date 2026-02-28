.PHONY: dev dev-db dev-backend dev-frontend migrate test down clean

# ---- Development ----

dev: dev-db
	@echo "Starting backend and frontend..."
	@start /B cmd /C "cd backend && go run ./cmd/server"
	@cd frontend && npm run dev

dev-db:
	docker compose up -d postgres
	@echo "Waiting for PostgreSQL..."
	@timeout /t 3 /nobreak >nul 2>&1 || sleep 3

dev-backend:
	cd backend && go run ./cmd/server

dev-frontend:
	cd frontend && npm run dev

# ---- Database ----

migrate:
	@echo "Running migrations..."
	@docker exec -i expctrl-postgres psql -U expctrl -d expctrl < backend/migrations/000001_init_schema.up.sql

migrate-down:
	@echo "Rolling back migrations..."
	@docker exec -i expctrl-postgres psql -U expctrl -d expctrl < backend/migrations/000001_init_schema.down.sql

# ---- Testing ----

test: test-backend test-frontend

test-backend:
	cd backend && go test ./...

test-frontend:
	cd frontend && npm test -- --watchAll=false

# ---- Cleanup ----

down:
	docker compose down

clean:
	docker compose down -v
	cd frontend && rm -rf .next node_modules
	cd backend && rm -f server

# ---- Build ----

build-frontend:
	cd frontend && npm run build

build-backend:
	cd backend && GOOS=linux GOARCH=amd64 go build -o server ./cmd/server
