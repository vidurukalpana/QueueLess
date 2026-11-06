package handlers

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/stretchr/testify/require"

	"github.com/vidurukalpana/QueueLess/backend/internal/db"
)

const (
	testEnvFile     = "../../../.env"
	testMigrations  = "../../db/migrations/*.up.sql"
	testTimezone    = "Asia/Colombo"
	resetSchemaStmt = "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
)

// newTestPool returns a pool on an empty, fully migrated test database.
func newTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	ctx := context.Background()

	if err := godotenv.Load(testEnvFile); err != nil && !os.IsNotExist(err) {
		require.NoError(t, err)
	}
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	require.NotEmpty(t, databaseURL, "TEST_DATABASE_URL is required")

	pool, err := db.NewPool(ctx, databaseURL, testTimezone)
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	_, err = pool.Exec(ctx, resetSchemaStmt)
	require.NoError(t, err)

	files, err := filepath.Glob(testMigrations)
	require.NoError(t, err)
	require.NotEmpty(t, files)
	for _, file := range files {
		migration, err := os.ReadFile(file)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, string(migration))
		require.NoError(t, err)
	}
	return pool
}
