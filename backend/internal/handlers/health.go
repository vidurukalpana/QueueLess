package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"
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
			writeHealth(w, http.StatusServiceUnavailable, map[string]string{"error": "database unavailable"})
			return
		}
		writeHealth(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

func writeHealth(w http.ResponseWriter, status int, body map[string]string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		log.Printf("write health response: %v", err)
	}
}
