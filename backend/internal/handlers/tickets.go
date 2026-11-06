package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vidurukalpana/QueueLess/backend/internal/db"
	"github.com/vidurukalpana/QueueLess/backend/internal/httpx"
)

const (
	statusWaiting = "waiting"
	statusCalled  = "called"
	statusDone    = "done"
	statusSkipped = "skipped"

	queueStatusOpen       = "open"
	maxCustomerNameLength = 40
)

var errQueueNotOpen = errors.New("queue is not open")

// Tickets handles queue tickets.
type Tickets struct {
	pool     *pgxpool.Pool
	queries  *db.Queries
	location *time.Location
}

// NewTickets creates the ticket handlers.
func NewTickets(pool *pgxpool.Pool, queries *db.Queries, location *time.Location) *Tickets {
	return &Tickets{pool: pool, queries: queries, location: location}
}

type ownerTicketResponse struct {
	ID           uuid.UUID  `json:"id"`
	Number       int32      `json:"number"`
	CustomerName string     `json:"customerName"`
	Status       string     `json:"status"`
	CreatedAt    time.Time  `json:"createdAt"`
	CalledAt     *time.Time `json:"calledAt"`
}

type callNextResponse struct {
	Ticket *ownerTicketResponse `json:"ticket"`
}

type joinQueueRequest struct {
	Name string `json:"name"`
}

type joinQueueResponse struct {
	TicketID uuid.UUID `json:"ticketId"`
	Number   int32     `json:"number"`
	Token    uuid.UUID `json:"token"`
}

// List returns a queue's waiting or called tickets.
func (t *Tickets) List(w http.ResponseWriter, r *http.Request) {
	queueID, ok := parseID(w, r)
	if !ok {
		return
	}
	if _, ok := requireQueueOwner(w, r, t.queries, queueID); !ok {
		return
	}

	if err := t.queries.CancelStaleTickets(r.Context(), queueID); err != nil {
		log.Printf("list tickets: cancel stale: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	tickets, err := t.queries.ListActiveTickets(r.Context(), queueID)
	if err != nil {
		log.Printf("list tickets: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	response := make([]ownerTicketResponse, 0, len(tickets))
	for _, ticket := range tickets {
		response = append(response, t.toResponse(ticket))
	}
	httpx.WriteJSON(w, http.StatusOK, response)
}

// CallNext completes the current ticket, then calls the next waiting one.
func (t *Tickets) CallNext(w http.ResponseWriter, r *http.Request) {
	queueID, ok := parseID(w, r)
	if !ok {
		return
	}
	if _, ok := requireQueueOwner(w, r, t.queries, queueID); !ok {
		return
	}

	called, err := t.callNext(r.Context(), queueID)
	if err != nil {
		log.Printf("call next: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	if called == nil {
		httpx.WriteJSON(w, http.StatusOK, callNextResponse{})
		return
	}
	response := t.toResponse(*called)
	httpx.WriteJSON(w, http.StatusOK, callNextResponse{Ticket: &response})
}

func (t *Tickets) callNext(ctx context.Context, queueID uuid.UUID) (*db.Ticket, error) {
	var called *db.Ticket
	err := t.inTx(ctx, func(queries *db.Queries) error {
		// The row lock makes simultaneous calls run one at a time.
		if _, err := queries.GetQueueForUpdate(ctx, queueID); err != nil {
			return fmt.Errorf("lock queue: %w", err)
		}
		if err := queries.CancelStaleTickets(ctx, queueID); err != nil {
			return fmt.Errorf("cancel stale: %w", err)
		}
		if err := queries.CompleteCalledTickets(ctx, queueID); err != nil {
			return fmt.Errorf("complete called: %w", err)
		}

		next, err := queries.GetFirstWaitingTicket(ctx, queueID)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		if err != nil {
			return fmt.Errorf("get first waiting: %w", err)
		}

		ticket, err := queries.UpdateTicketStatus(ctx, db.UpdateTicketStatusParams{ID: next.ID, Status: statusCalled})
		if err != nil {
			return fmt.Errorf("call ticket: %w", err)
		}
		called = &ticket
		return nil
	})
	return called, err
}

// Join adds a customer to an open queue.
func (t *Tickets) Join(w http.ResponseWriter, r *http.Request) {
	queueID, ok := parseID(w, r)
	if !ok {
		return
	}

	var input joinQueueRequest
	if err := httpx.DecodeJSON(w, r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	name := strings.TrimSpace(input.Name)
	if length := utf8.RuneCountInString(name); length < 1 || length > maxCustomerNameLength {
		httpx.WriteError(w, http.StatusBadRequest, "name must be 1 to 40 characters")
		return
	}

	ticket, err := t.join(r.Context(), queueID, name)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		httpx.WriteError(w, http.StatusNotFound, "not found")
	case errors.Is(err, errQueueNotOpen):
		httpx.WriteError(w, http.StatusConflict, "queue is not open")
	case err != nil:
		log.Printf("join queue: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
	default:
		httpx.WriteJSON(w, http.StatusCreated, joinQueueResponse{TicketID: ticket.ID, Number: ticket.Number, Token: ticket.Token})
	}
}

func (t *Tickets) join(ctx context.Context, queueID uuid.UUID, name string) (db.Ticket, error) {
	var ticket db.Ticket
	err := t.inTx(ctx, func(queries *db.Queries) error {
		// The row lock keeps ticket numbers unique when customers join together.
		queue, err := queries.GetQueueForUpdate(ctx, queueID)
		if err != nil {
			return fmt.Errorf("lock queue: %w", err)
		}
		if queue.Status != queueStatusOpen {
			return errQueueNotOpen
		}
		if err := queries.CancelStaleTickets(ctx, queueID); err != nil {
			return fmt.Errorf("cancel stale: %w", err)
		}

		number, err := queries.NextTicketNumber(ctx, queueID)
		if err != nil {
			return fmt.Errorf("next ticket number: %w", err)
		}

		ticket, err = queries.CreateTicket(ctx, db.CreateTicketParams{
			QueueID:      queueID,
			Number:       number,
			CustomerName: name,
			Token:        uuid.New(),
		})
		if err != nil {
			return fmt.Errorf("create ticket: %w", err)
		}
		return nil
	})
	return ticket, err
}

// inTx runs fn in a transaction, committing only when it succeeds.
func (t *Tickets) inTx(ctx context.Context, fn func(queries *db.Queries) error) error {
	tx, err := t.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin: %w", err)
	}
	defer func() {
		if err := tx.Rollback(context.WithoutCancel(ctx)); err != nil && !errors.Is(err, pgx.ErrTxClosed) {
			log.Printf("rollback: %v", err)
		}
	}()

	if err := fn(t.queries.WithTx(tx)); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

// Skip removes a waiting or called ticket from the queue.
func (t *Tickets) Skip(w http.ResponseWriter, r *http.Request) {
	t.changeStatus(w, r, statusSkipped, statusWaiting, statusCalled)
}

// Done completes a called ticket.
func (t *Tickets) Done(w http.ResponseWriter, r *http.Request) {
	t.changeStatus(w, r, statusDone, statusCalled)
}

func (t *Tickets) changeStatus(w http.ResponseWriter, r *http.Request, status string, allowedFrom ...string) {
	ticketID, ok := parseID(w, r)
	if !ok {
		return
	}

	ticket, err := t.queries.GetTicket(r.Context(), ticketID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		log.Printf("change ticket status: get ticket: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	if _, ok := requireQueueOwner(w, r, t.queries, ticket.QueueID); !ok {
		return
	}

	if !slices.Contains(allowedFrom, ticket.Status) {
		httpx.WriteError(w, http.StatusConflict, "ticket status does not allow this action")
		return
	}

	updated, err := t.queries.UpdateTicketStatus(r.Context(), db.UpdateTicketStatusParams{ID: ticket.ID, Status: status})
	if err != nil {
		log.Printf("change ticket status: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, t.toResponse(updated))
}

func (t *Tickets) toResponse(ticket db.Ticket) ownerTicketResponse {
	response := ownerTicketResponse{
		ID:           ticket.ID,
		Number:       ticket.Number,
		CustomerName: ticket.CustomerName,
		Status:       ticket.Status,
		CreatedAt:    ticket.CreatedAt.In(t.location),
	}
	if ticket.CalledAt != nil {
		calledAt := ticket.CalledAt.In(t.location)
		response.CalledAt = &calledAt
	}
	return response
}
