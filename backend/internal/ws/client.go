package ws

import (
	"errors"
	"log"
	"net"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 54 * time.Second
	maxMessageSize = 512
	sendBufferSize = 16
)

// Client is one browser connected to a queue.
type Client struct {
	hub     *Hub
	conn    *websocket.Conn
	queueID uuid.UUID
	send    chan []byte
}

func newClient(hub *Hub, conn *websocket.Conn, queueID uuid.UUID) *Client {
	return &Client{
		hub:     hub,
		conn:    conn,
		queueID: queueID,
		send:    make(chan []byte, sendBufferSize),
	}
}

// readPump detects disconnects; browsers send nothing the server needs.
func (c *Client) readPump() {
	defer func() {
		select {
		case c.hub.unregister <- c:
		case <-c.hub.done:
		}
		c.close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	if err := c.conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
		log.Printf("set read deadline: %v", err)
		return
	}
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			return
		}
	}
}

// writePump is the only goroutine that writes to the connection.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.close()
	}()

	for {
		select {
		case payload, ok := <-c.send:
			if err := c.conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				log.Printf("set write deadline: %v", err)
				return
			}
			if !ok {
				// Both errors mean the browser left first.
				err := c.conn.WriteMessage(websocket.CloseMessage, nil)
				if err != nil && !errors.Is(err, net.ErrClosed) && !errors.Is(err, websocket.ErrCloseSent) {
					log.Printf("write websocket close: %v", err)
				}
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, payload); err != nil {
				return
			}
		case <-ticker.C:
			if err := c.conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				log.Printf("set write deadline: %v", err)
				return
			}
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) close() {
	if err := c.conn.Close(); err != nil && !errors.Is(err, net.ErrClosed) {
		log.Printf("close websocket: %v", err)
	}
}
