// Package email delivers messages to owners.
package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

const (
	resendURL   = "https://api.resend.com/emails"
	sendTimeout = 10 * time.Second
)

// Message is one plain text email.
type Message struct {
	To      string
	Subject string
	Text    string
}

// Sender delivers an email.
type Sender interface {
	Send(ctx context.Context, message Message) error
}

// NewSender uses Resend when a key is set, otherwise it prints emails to the log.
func NewSender(apiKey, from string) Sender {
	if apiKey == "" {
		return logSender{}
	}
	return &resendSender{
		apiKey: apiKey,
		from:   from,
		url:    resendURL,
		client: &http.Client{Timeout: sendTimeout},
	}
}

// logSender lets the full flow run locally without an email service.
type logSender struct{}

func (logSender) Send(_ context.Context, message Message) error {
	log.Printf("email to %s: %s\n%s", message.To, message.Subject, message.Text)
	return nil
}

type resendSender struct {
	apiKey string
	from   string
	url    string
	client *http.Client
}

type resendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Text    string   `json:"text"`
}

func (s *resendSender) Send(ctx context.Context, message Message) error {
	body, err := json.Marshal(resendRequest{
		From:    s.from,
		To:      []string{message.To},
		Subject: message.Subject,
		Text:    message.Text,
	})
	if err != nil {
		return fmt.Errorf("encode email: %w", err)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, s.url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create email request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+s.apiKey)
	request.Header.Set("Content-Type", "application/json")

	response, err := s.client.Do(request)
	if err != nil {
		return fmt.Errorf("send email: %w", err)
	}
	defer func() {
		if err := response.Body.Close(); err != nil {
			log.Printf("close email response: %v", err)
		}
	}()

	if response.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("send email: resend returned status %d", response.StatusCode)
	}
	return nil
}
