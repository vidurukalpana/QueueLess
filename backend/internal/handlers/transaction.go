package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vidurukalpana/QueueLess/backend/internal/db"
)

// inTx runs fn in a transaction, committing only when it succeeds.
func inTx(ctx context.Context, pool *pgxpool.Pool, queries *db.Queries, fn func(queries *db.Queries) error) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin: %w", err)
	}
	defer func() {
		if err := tx.Rollback(context.WithoutCancel(ctx)); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
			log.Printf("rollback: %v", err)
		}
	}()

	if err := fn(queries.WithTx(tx)); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}
