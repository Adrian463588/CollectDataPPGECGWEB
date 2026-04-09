// ============================================================
// Migrate — Auto-migration runner using embedded SQL
// Runs all DDL statements on startup (idempotent — uses IF NOT EXISTS).
// ============================================================
package store

import (
	"context"
	"embed"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/all.sql
var migrationFS embed.FS

// RunMigrations executes the embedded all.sql migration file against the
// database. All statements use CREATE TABLE/INDEX IF NOT EXISTS so this
// is safe to call on every startup — it is a no-op on an already-migrated DB.
func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	sql, err := migrationFS.ReadFile("migrations/all.sql")
	if err != nil {
		return fmt.Errorf("read embedded migration: %w", err)
	}

	_, err = pool.Exec(ctx, string(sql))
	if err != nil {
		return fmt.Errorf("execute migration: %w", err)
	}

	slog.Info("database migrations applied successfully")
	return nil
}
