package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"

	"github.com/vidurukalpana/QueueLess/backend/internal/db"
)

const testJWTSecret = "test-secret"

func register(handler *Auth, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(body))
	recorder := httptest.NewRecorder()
	handler.Register(recorder, request)
	return recorder
}

func TestRegisterCreatesOwner(t *testing.T) {
	queries := db.New(newTestPool(t))

	response := register(NewAuth(queries, testJWTSecret), `{"email":" Owner@Example.com ","password":"password123"}`)

	require.Equal(t, http.StatusCreated, response.Code)
	var owner ownerResponse
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &owner))
	assert.Equal(t, "owner@example.com", owner.Email)

	stored, err := queries.GetUserByEmail(context.Background(), "owner@example.com")
	require.NoError(t, err)
	assert.Equal(t, owner.ID, stored.ID)
	assert.NoError(t, bcrypt.CompareHashAndPassword([]byte(stored.PasswordHash), []byte("password123")))
}

func TestRegisterRejectsDuplicateEmail(t *testing.T) {
	handler := NewAuth(db.New(newTestPool(t)), testJWTSecret)
	require.Equal(t, http.StatusCreated, register(handler, `{"email":"owner@example.com","password":"password123"}`).Code)

	response := register(handler, `{"email":"OWNER@example.com","password":"different123"}`)

	assert.Equal(t, http.StatusConflict, response.Code)
	assert.JSONEq(t, `{"error":"email already registered"}`, response.Body.String())
}

func TestRegisterRejectsInvalidInput(t *testing.T) {
	handler := NewAuth(db.New(newTestPool(t)), testJWTSecret)
	tests := []struct {
		name string
		body string
	}{
		{name: "invalid email", body: `{"email":"not-an-email","password":"password123"}`},
		{name: "short password", body: `{"email":"owner@example.com","password":"short"}`},
		{name: "long password", body: `{"email":"owner@example.com","password":"` + strings.Repeat("a", 73) + `"}`},
		{name: "malformed body", body: `{"email":`},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			assert.Equal(t, http.StatusBadRequest, register(handler, test.body).Code)
		})
	}
}

func login(handler *Auth, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(body))
	recorder := httptest.NewRecorder()
	handler.Login(recorder, request)
	return recorder
}

func TestLoginReturnsToken(t *testing.T) {
	handler := NewAuth(db.New(newTestPool(t)), testJWTSecret)
	require.Equal(t, http.StatusCreated, register(handler, `{"email":"owner@example.com","password":"password123"}`).Code)

	response := login(handler, `{"email":"Owner@Example.com","password":"password123"}`)

	require.Equal(t, http.StatusOK, response.Code)
	var body loginResponse
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body))
	assert.NotEmpty(t, body.Token)
}

func TestLoginRejectsInvalidCredentials(t *testing.T) {
	handler := NewAuth(db.New(newTestPool(t)), testJWTSecret)
	require.Equal(t, http.StatusCreated, register(handler, `{"email":"owner@example.com","password":"password123"}`).Code)
	tests := []struct {
		name string
		body string
	}{
		{name: "wrong password", body: `{"email":"owner@example.com","password":"wrong-password"}`},
		{name: "unknown email", body: `{"email":"nobody@example.com","password":"password123"}`},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := login(handler, test.body)

			assert.Equal(t, http.StatusUnauthorized, response.Code)
			assert.JSONEq(t, `{"error":"invalid email or password"}`, response.Body.String())
		})
	}
}
