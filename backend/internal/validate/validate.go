// Package validate holds the rules for input received from clients.
package validate

import (
	"fmt"
	"net/mail"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
)

const (
	// MaxCustomerName is the longest customer name in characters.
	MaxCustomerName = 40
	// MaxQueueName is the longest queue name in characters.
	MaxQueueName = 80

	minPasswordLength = 8
	// bcrypt rejects passwords longer than 72 bytes.
	maxPasswordBytes = 72
	minQueueSize     = 1
	maxQueueSize     = 500
)

// ID parses a UUID from a URL.
func ID(value string) (uuid.UUID, error) {
	id, err := uuid.Parse(value)
	if err != nil {
		return uuid.Nil, fmt.Errorf("parse id: %w", err)
	}
	return id, nil
}

// Name removes control characters, trims spaces, then checks the length.
func Name(value string, maxLength int) (string, bool) {
	cleaned := strings.TrimSpace(strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, value))

	length := utf8.RuneCountInString(cleaned)
	return cleaned, length >= 1 && length <= maxLength
}

// Email normalizes an address, then checks its format.
func Email(value string) (string, bool) {
	email := strings.ToLower(strings.TrimSpace(value))
	address, err := mail.ParseAddress(email)
	return email, err == nil && address.Address == email
}

// Password checks the length rules.
func Password(value string) bool {
	return len(value) >= minPasswordLength && len(value) <= maxPasswordBytes
}

// QueueStatus checks a queue status.
func QueueStatus(value string) bool {
	switch value {
	case "open", "paused", "closed":
		return true
	default:
		return false
	}
}

// QueueSize checks a maximum queue size.
func QueueSize(value int32) bool {
	return value >= minQueueSize && value <= maxQueueSize
}
