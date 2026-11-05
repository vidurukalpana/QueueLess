package middleware

import (
	"net/http"

	"github.com/go-chi/cors"
)

// CORS allows browser requests only from the frontend origin.
func CORS(frontendURL string) func(http.Handler) http.Handler {
	return cors.Handler(cors.Options{
		AllowedOrigins: []string{frontendURL},
		AllowedMethods: []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete},
		AllowedHeaders: []string{"Authorization", "Content-Type", "X-Ticket-Token"},
	})
}
