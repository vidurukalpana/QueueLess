package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/vidurukalpana/QueueLess/backend/internal/auth"
)

const testSecret = "test-secret"

func TestAuthenticateStoresUserID(t *testing.T) {
	userID := uuid.New()
	token, err := auth.SignToken(userID, testSecret)
	require.NoError(t, err)

	var stored uuid.UUID
	next := http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		id, ok := UserID(r.Context())
		require.True(t, ok)
		stored = id
	})
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.Header.Set("Authorization", "Bearer "+token)

	Authenticate(testSecret)(next).ServeHTTP(httptest.NewRecorder(), request)

	assert.Equal(t, userID, stored)
}

func TestAuthenticateRejectsBadHeaders(t *testing.T) {
	token, err := auth.SignToken(uuid.New(), testSecret)
	require.NoError(t, err)
	tests := []struct {
		name   string
		header string
	}{
		{name: "missing header"},
		{name: "wrong scheme", header: "Basic " + token},
		{name: "invalid token", header: "Bearer not-a-token"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			next := http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
				t.Error("next handler must not run")
			})
			request := httptest.NewRequest(http.MethodGet, "/", nil)
			if test.header != "" {
				request.Header.Set("Authorization", test.header)
			}
			recorder := httptest.NewRecorder()

			Authenticate(testSecret)(next).ServeHTTP(recorder, request)

			assert.Equal(t, http.StatusUnauthorized, recorder.Code)
			assert.JSONEq(t, `{"error":"unauthorized"}`, recorder.Body.String())
		})
	}
}
