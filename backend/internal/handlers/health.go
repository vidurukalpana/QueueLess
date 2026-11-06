package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/vidurukalpana/QueueLess/backend/internal/httpx"
)

const healthTimeout = 2 * time.Second

// Pinger checks that a dependency is reachable.
type Pinger interface {
	Ping(ctx context.Context) error
}

// Health reports 200 when the database responds, otherwise 503.
func Health(database Pinger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), healthTimeout)
		defer cancel()

		if err := database.Ping(ctx); err != nil {
			log.Printf("health check: %v", err)
			httpx.WriteError(w, http.StatusServiceUnavailable, "database unavailable")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}
