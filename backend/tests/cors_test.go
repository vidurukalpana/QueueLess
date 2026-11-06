package tests

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/vidurukalpana/QueueLess/backend/internal/middleware"
)

const frontendOrigin = "https://queueless.example"

func TestCORSAllowsOnlyFrontendOrigin(t *testing.T) {
	tests := []struct {
		name   string
		origin string
		want   string
	}{
		{name: "frontend origin", origin: frontendOrigin, want: frontendOrigin},
		{name: "other origin", origin: "https://evil.example", want: ""},
	}

	handler := middleware.CORS(frontendOrigin)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/", nil)
			request.Header.Set("Origin", test.origin)
			recorder := httptest.NewRecorder()

			handler.ServeHTTP(recorder, request)

			if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != test.want {
				t.Fatalf("Access-Control-Allow-Origin = %q, want %q", got, test.want)
			}
		})
	}
}
