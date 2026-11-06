// Package ws pushes live queue updates to browsers over WebSockets.
package ws

import (
	"context"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type roomMessage struct {
	queueID uuid.UUID
	payload []byte
}

// Hub tracks the clients of each queue. Only Run touches rooms, so it needs no lock.
type Hub struct {
	rooms      map[uuid.UUID]map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan roomMessage
	done       chan struct{}
	upgrader   websocket.Upgrader
}

// NewHub creates a hub that accepts browsers from frontendURL only.
func NewHub(frontendURL string) *Hub {
	return &Hub{
		rooms:      make(map[uuid.UUID]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan roomMessage),
		done:       make(chan struct{}),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return r.Header.Get("Origin") == frontendURL
			},
		},
	}
}

// Run handles every hub event until ctx is cancelled.
func (h *Hub) Run(ctx context.Context) {
	defer close(h.done)

	for {
		select {
		case client := <-h.register:
			if h.rooms[client.queueID] == nil {
				h.rooms[client.queueID] = make(map[*Client]bool)
			}
			h.rooms[client.queueID][client] = true
		case client := <-h.unregister:
			h.remove(client)
		case message := <-h.broadcast:
			for client := range h.rooms[message.queueID] {
				select {
				case client.send <- message.payload:
				default:
					// A full buffer means the client stopped reading.
					h.remove(client)
				}
			}
		case <-ctx.Done():
			for _, room := range h.rooms {
				for client := range room {
					h.remove(client)
				}
			}
			return
		}
	}
}

// Broadcast sends payload to every client of a queue.
func (h *Hub) Broadcast(queueID uuid.UUID, payload []byte) {
	select {
	case h.broadcast <- roomMessage{queueID: queueID, payload: payload}:
	case <-h.done:
	}
}

// ServeClient upgrades the request, then serves the client until it disconnects.
func (h *Hub) ServeClient(w http.ResponseWriter, r *http.Request, queueID uuid.UUID) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade websocket: %v", err)
		return
	}

	client := newClient(h, conn, queueID)
	select {
	case h.register <- client:
	case <-h.done:
		if err := conn.Close(); err != nil {
			log.Printf("close websocket: %v", err)
		}
		return
	}

	go client.writePump()
	go client.readPump()
}

func (h *Hub) remove(client *Client) {
	room := h.rooms[client.queueID]
	if !room[client] {
		return
	}

	delete(room, client)
	close(client.send)
	if len(room) == 0 {
		delete(h.rooms, client.queueID)
	}
}
