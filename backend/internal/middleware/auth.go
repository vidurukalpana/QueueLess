package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/vidurukalpana/QueueLess/backend/internal/auth"
	"github.com/vidurukalpana/QueueLess/backend/internal/httpx"
)

const bearerPrefix = "Bearer "

type userIDKey struct{}

// Authenticate rejects requests without a valid Bearer token.
func Authenticate(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, found := strings.CutPrefix(r.Header.Get("Authorization"), bearerPrefix)
			if !found {
				httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
				return
			}

			userID, err := auth.VerifyToken(token, jwtSecret)
			if err != nil {
				httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
				return
			}

			ctx := context.WithValue(r.Context(), userIDKey{}, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserID returns the owner stored by Authenticate.
func UserID(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(userIDKey{}).(uuid.UUID)
	return userID, ok
}
