package handlers

import (
	"errors"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5"

	"github.com/vidurukalpana/QueueLess/backend/internal/db"
	"github.com/vidurukalpana/QueueLess/backend/internal/httpx"
	"github.com/vidurukalpana/QueueLess/backend/internal/ws"
)

// Socket connects browsers to the live updates of a queue.
type Socket struct {
	queries *db.Queries
	hub     *ws.Hub
}

// NewSocket creates the WebSocket handler.
func NewSocket(queries *db.Queries, hub *ws.Hub) *Socket {
	return &Socket{queries: queries, hub: hub}
}

// Connect upgrades the request for an existing queue.
func (s *Socket) Connect(w http.ResponseWriter, r *http.Request) {
	queueID, ok := parseID(w, r)
	if !ok {
		return
	}

	_, err := s.queries.GetQueue(r.Context(), queueID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		log.Printf("connect socket: get queue: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	s.hub.ServeClient(w, r, queueID)
}
