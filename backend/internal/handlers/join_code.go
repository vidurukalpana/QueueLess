package handlers

import (
	"crypto/rand"
	"fmt"
)

// Look-alike characters are left out because customers may read the code aloud.
const (
	joinCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	joinCodeLength   = 6
)

func newJoinCode() (string, error) {
	random := make([]byte, joinCodeLength)
	if _, err := rand.Read(random); err != nil {
		return "", fmt.Errorf("generate join code: %w", err)
	}

	code := make([]byte, joinCodeLength)
	for i, value := range random {
		code[i] = joinCodeAlphabet[int(value)%len(joinCodeAlphabet)]
	}
	return string(code), nil
}
