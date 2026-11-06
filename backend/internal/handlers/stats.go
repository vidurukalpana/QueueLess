package handlers

import (
	"log"
	"math"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/vidurukalpana/QueueLess/backend/internal/db"
	"github.com/vidurukalpana/QueueLess/backend/internal/httpx"
)

const statsDateLayout = "2006-01-02"

type queueStatsResponse struct {
	Served            int32    `json:"served"`
	Skipped           int32    `json:"skipped"`
	AvgWaitMinutes    *float64 `json:"avgWaitMinutes"`
	AvgServiceMinutes *float64 `json:"avgServiceMinutes"`
}

// Stats returns one Sri Lanka day of a queue's statistics.
func (q *Queues) Stats(w http.ResponseWriter, r *http.Request) {
	queueID, ok := parseID(w, r)
	if !ok {
		return
	}
	queue, ok := requireQueueOwner(w, r, q.queries, queueID)
	if !ok {
		return
	}

	date := time.Now().In(q.location)
	if value := r.URL.Query().Get("date"); value != "" {
		parsed, err := time.ParseInLocation(statsDateLayout, value, q.location)
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, "date must be YYYY-MM-DD")
			return
		}
		date = parsed
	}

	stats, err := q.queries.GetQueueStats(r.Context(), db.GetQueueStatsParams{
		QueueID:   queue.ID,
		StatsDate: pgtype.Date{Time: date, Valid: true},
	})
	if err != nil {
		log.Printf("get queue stats: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	response := queueStatsResponse{Served: stats.Served, Skipped: stats.Skipped}
	if stats.Called > 0 {
		response.AvgWaitMinutes = roundedMinutes(stats.AvgWaitMinutes)
	}
	if stats.Served > 0 {
		response.AvgServiceMinutes = roundedMinutes(stats.AvgServiceMinutes)
	}
	httpx.WriteJSON(w, http.StatusOK, response)
}

func roundedMinutes(minutes float64) *float64 {
	rounded := math.Round(minutes*10) / 10
	return &rounded
}
