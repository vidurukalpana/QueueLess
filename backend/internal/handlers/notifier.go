package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/google/uuid"

	"github.com/vidurukalpana/QueueLess/backend/internal/db"
	"github.com/vidurukalpana/QueueLess/backend/internal/ws"
)

const queueUpdatedType = "queue_updated"

// Notifier pushes queue snapshots to connected browsers.
type Notifier struct {
	queries *db.Queries
	hub     *ws.Hub
}

// NewNotifier creates the snapshot broadcaster.
func NewNotifier(queries *db.Queries, hub *ws.Hub) *Notifier {
	return &Notifier{queries: queries, hub: hub}
}

type waitingTicket struct {
	TicketID  uuid.UUID `json:"ticketId"`
	Number    int32     `json:"number"`
	CheckedIn bool      `json:"checkedIn"`
}

// queueUpdated leaves out customer names because every visitor receives it.
type queueUpdated struct {
	Type       string          `json:"type"`
	QueueID    uuid.UUID       `json:"queueId"`
	Status     string          `json:"status"`
	NowServing *int32          `json:"nowServing"`
	Waiting    []waitingTicket `json:"waiting"`
}

// QueueChanged broadcasts a snapshot. The change is already saved, so failures are only logged.
func (n *Notifier) QueueChanged(ctx context.Context, queueID uuid.UUID) {
	ctx = context.WithoutCancel(ctx)

	payload, err := n.snapshot(ctx, queueID)
	if err != nil {
		log.Printf("broadcast queue %s: %v", queueID, err)
		return
	}
	n.hub.Broadcast(queueID, payload)
}

func (n *Notifier) snapshot(ctx context.Context, queueID uuid.UUID) ([]byte, error) {
	queue, err := n.queries.GetQueue(ctx, queueID)
	if err != nil {
		return nil, fmt.Errorf("get queue: %w", err)
	}
	if err := n.queries.CancelStaleTickets(ctx, queueID); err != nil {
		return nil, fmt.Errorf("cancel stale: %w", err)
	}
	tickets, err := n.queries.ListActiveTickets(ctx, queueID)
	if err != nil {
		return nil, fmt.Errorf("list active tickets: %w", err)
	}

	message := queueUpdated{
		Type:    queueUpdatedType,
		QueueID: queueID,
		Status:  queue.Status,
		Waiting: make([]waitingTicket, 0, len(tickets)),
	}
	for _, ticket := range tickets {
		if ticket.Status == statusCalled {
			number := ticket.Number
			message.NowServing = &number
			continue
		}
		message.Waiting = append(message.Waiting, waitingTicket{
			TicketID:  ticket.ID,
			Number:    ticket.Number,
			CheckedIn: ticket.CheckedInAt != nil,
		})
	}

	payload, err := json.Marshal(message)
	if err != nil {
		return nil, fmt.Errorf("encode snapshot: %w", err)
	}
	return payload, nil
}
