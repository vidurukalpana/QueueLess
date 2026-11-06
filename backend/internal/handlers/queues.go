package handlers

import (
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/vidurukalpana/QueueLess/backend/internal/db"
	"github.com/vidurukalpana/QueueLess/backend/internal/httpx"
	"github.com/vidurukalpana/QueueLess/backend/internal/middleware"
)

// Queues handles queue management.
type Queues struct {
	queries  *db.Queries
	location *time.Location
	notifier *Notifier
}

// NewQueues creates the queue handlers.
func NewQueues(queries *db.Queries, location *time.Location, notifier *Notifier) *Queues {
	return &Queues{queries: queries, location: location, notifier: notifier}
}

type createQueueRequest struct {
	Name string `json:"name"`
}

type updateQueueRequest struct {
	Status string `json:"status"`
}

type publicQueueResponse struct {
	Name   string `json:"name"`
	Status string `json:"status"`
}

type ownerQueueResponse struct {
	ID                uuid.UUID `json:"id"`
	Name              string    `json:"name"`
	Status            string    `json:"status"`
	AvgServiceMinutes int32     `json:"avgServiceMinutes"`
	CreatedAt         time.Time `json:"createdAt"`
}

// Create adds a queue for the logged-in owner.
func (q *Queues) Create(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := middleware.UserID(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var input createQueueRequest
	if err := httpx.DecodeJSON(w, r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		httpx.WriteError(w, http.StatusBadRequest, "name is required")
		return
	}

	joinCode, err := newJoinCode()
	if err != nil {
		log.Printf("create queue: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	queue, err := q.queries.CreateQueue(r.Context(), db.CreateQueueParams{OwnerID: ownerID, Name: name, JoinCode: joinCode})
	if err != nil {
		log.Printf("create queue: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, q.toOwnerResponse(queue))
}

// List returns the logged-in owner's queues.
func (q *Queues) List(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := middleware.UserID(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	queues, err := q.queries.ListQueuesByOwner(r.Context(), ownerID)
	if err != nil {
		log.Printf("list queues: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	response := make([]ownerQueueResponse, 0, len(queues))
	for _, queue := range queues {
		response = append(response, q.toOwnerResponse(queue))
	}
	httpx.WriteJSON(w, http.StatusOK, response)
}

// GetPublic returns the details anyone may see.
func (q *Queues) GetPublic(w http.ResponseWriter, r *http.Request) {
	queueID, ok := parseID(w, r)
	if !ok {
		return
	}

	queue, err := q.queries.GetQueue(r.Context(), queueID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		log.Printf("get queue: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, publicQueueResponse{Name: queue.Name, Status: queue.Status})
}

// Update changes a queue's status.
func (q *Queues) Update(w http.ResponseWriter, r *http.Request) {
	queueID, ok := parseID(w, r)
	if !ok {
		return
	}
	queue, ok := requireQueueOwner(w, r, q.queries, queueID)
	if !ok {
		return
	}

	var input updateQueueRequest
	if err := httpx.DecodeJSON(w, r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if !isQueueStatus(input.Status) {
		httpx.WriteError(w, http.StatusBadRequest, "invalid status")
		return
	}

	updated, err := q.queries.UpdateQueueStatus(r.Context(), db.UpdateQueueStatusParams{ID: queue.ID, Status: input.Status})
	if err != nil {
		log.Printf("update queue: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	q.notifier.QueueChanged(r.Context(), queue.ID)
	httpx.WriteJSON(w, http.StatusOK, q.toOwnerResponse(updated))
}

// parseID reads the id in the URL, answering 404 when it is malformed.
func parseID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "not found")
		return uuid.Nil, false
	}
	return id, true
}

// requireQueueOwner loads a queue, answering 404 unless the caller owns it.
func requireQueueOwner(w http.ResponseWriter, r *http.Request, queries *db.Queries, queueID uuid.UUID) (db.Queue, bool) {
	ownerID, ok := middleware.UserID(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return db.Queue{}, false
	}

	queue, err := queries.GetQueue(r.Context(), queueID)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && queue.OwnerID != ownerID) {
		httpx.WriteError(w, http.StatusNotFound, "not found")
		return db.Queue{}, false
	}
	if err != nil {
		log.Printf("get queue: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return db.Queue{}, false
	}
	return queue, true
}

func (q *Queues) toOwnerResponse(queue db.Queue) ownerQueueResponse {
	return ownerQueueResponse{
		ID:                queue.ID,
		Name:              queue.Name,
		Status:            queue.Status,
		AvgServiceMinutes: queue.AvgServiceMinutes,
		CreatedAt:         queue.CreatedAt.In(q.location),
	}
}

func isQueueStatus(status string) bool {
	switch status {
	case "open", "paused", "closed":
		return true
	default:
		return false
	}
}
