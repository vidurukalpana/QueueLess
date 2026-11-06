package middleware

import (
	"net/http"
	"time"

	"github.com/go-chi/httprate"

	"github.com/vidurukalpana/QueueLess/backend/internal/httpx"
)

// RateLimit allows requests per minute for each client IP. It uses the
// forwarded IP because every visitor shares the proxy address on the host.
func RateLimit(requests int) func(http.Handler) http.Handler {
	return httprate.Limit(
		requests,
		time.Minute,
		httprate.WithKeyFuncs(httprate.KeyByRealIP),
		httprate.WithLimitHandler(func(w http.ResponseWriter, _ *http.Request) {
			httpx.WriteError(w, http.StatusTooManyRequests, "too many requests")
		}),
	)
}
