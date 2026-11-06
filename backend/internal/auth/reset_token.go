package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

const resetTokenBytes = 32

// NewResetToken returns a random token for the email plus the hash to store.
func NewResetToken() (token, hash string, err error) {
	random := make([]byte, resetTokenBytes)
	if _, err := rand.Read(random); err != nil {
		return "", "", fmt.Errorf("generate reset token: %w", err)
	}

	token = hex.EncodeToString(random)
	return token, HashResetToken(token), nil
}

// HashResetToken hashes a token so a database leak exposes no usable links.
func HashResetToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
