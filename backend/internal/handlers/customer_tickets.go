package handlers

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/vidurukalpana/QueueLess/backend/internal/db"
	"github.com/vidurukalpana/QueueLess/backend/internal/httpx"
	"github.com/vidurukalpana/QueueLess/backend/internal/queue"
)

const (
	ticketTokenHeader = "X-Ticket-Token"
	statusCancelled   = "cancelled"
)

type ticketStatusResponse struct {
	Number     int32     `json:"number"`
	Status     string    `json:"status"`
	Position   *int      `json:"position"`
	ETAMinutes *int      `json:"etaMinutes"`
	QueueName  string    `json:"queueName"`
	QueueID    uuid.UUID `json:"queueId"`
}

// GetStatus returns a customer's ticket with its wait estimate.
func (t *Tickets) GetStatus(w http.ResponseWriter, r *http.Request) {
	ticket, ok := t.requireTicketToken(w, r)
	if !ok {
		return
	}

	response, err := t.ticketStatus(r.Context(), ticket)
	if err != nil {
		log.Printf("get ticket status: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, response)
}

func (t *Tickets) ticketStatus(ctx context.Context, ticket db.Ticket) (ticketStatusResponse, error) {
	if err := t.queries.CancelStaleTickets(ctx, ticket.QueueID); err != nil {
		return ticketStatusResponse{}, fmt.Errorf("cancel stale: %w", err)
	}

	current, err := t.queries.GetTicket(ctx, ticket.ID)
	if err != nil {
		return ticketStatusResponse{}, fmt.Errorf("get ticket: %w", err)
	}
	owningQueue, err := t.queries.GetQueue(ctx, current.QueueID)
	if err != nil {
		return ticketStatusResponse{}, fmt.Errorf("get queue: %w", err)
	}

	response := ticketStatusResponse{
		Number:    current.Number,
		Status:    current.Status,
		QueueName: owningQueue.Name,
		QueueID:   owningQueue.ID,
	}
	if current.Status != statusWaiting {
		return response, nil
	}

	active, err := t.queries.ListActiveTickets(ctx, current.QueueID)
	if err != nil {
		return ticketStatusResponse{}, fmt.Errorf("list active tickets: %w", err)
	}
	waiting := make([]int, 0, len(active))
	for _, item := range active {
		if item.Status == statusWaiting {
			waiting = append(waiting, int(item.Number))
		}
	}

	todayAverage, err := t.queries.AverageServiceMinutesToday(ctx, current.QueueID)
	if err != nil {
		return ticketStatusResponse{}, fmt.Errorf("average service minutes: %w", err)
	}

	position := queue.Position(waiting, int(current.Number))
	eta := queue.EstimateWait(position, queue.AverageMinutes(todayAverage, int(owningQueue.AvgServiceMinutes)))
	response.Position = &position
	response.ETAMinutes = &eta
	return response, nil
}

// Cancel removes a customer's active ticket from the queue.
func (t *Tickets) Cancel(w http.ResponseWriter, r *http.Request) {
	ticket, ok := t.requireTicketToken(w, r)
	if !ok {
		return
	}

	if ticket.Status == statusWaiting || ticket.Status == statusCalled {
		_, err := t.queries.UpdateTicketStatus(r.Context(), db.UpdateTicketStatusParams{ID: ticket.ID, Status: statusCancelled})
		if err != nil {
			log.Printf("cancel ticket: %v", err)
			httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
			return
		}
		t.notifier.QueueChanged(r.Context(), ticket.QueueID)
	}
	w.WriteHeader(http.StatusNoContent)
}

// requireTicketToken loads the ticket in the URL, answering 404 unless the token matches.
func (t *Tickets) requireTicketToken(w http.ResponseWriter, r *http.Request) (db.Ticket, bool) {
	ticketID, ok := parseID(w, r)
	if !ok {
		return db.Ticket{}, false
	}

	token, err := uuid.Parse(r.Header.Get(ticketTokenHeader))
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, "not found")
		return db.Ticket{}, false
	}

	ticket, err := t.queries.GetTicket(r.Context(), ticketID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "not found")
		return db.Ticket{}, false
	}
	if err != nil {
		log.Printf("get ticket: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return db.Ticket{}, false
	}

	if subtle.ConstantTimeCompare(token[:], ticket.Token[:]) != 1 {
		httpx.WriteError(w, http.StatusNotFound, "not found")
		return db.Ticket{}, false
	}
	return ticket, true
}
