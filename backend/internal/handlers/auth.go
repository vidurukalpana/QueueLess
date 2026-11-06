package handlers

import (
	"errors"
	"log"
	"net/http"
	"net/mail"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/vidurukalpana/QueueLess/backend/internal/auth"
	"github.com/vidurukalpana/QueueLess/backend/internal/db"
	"github.com/vidurukalpana/QueueLess/backend/internal/httpx"
)

const (
	minPasswordLength = 8
	// bcrypt rejects passwords longer than 72 bytes.
	maxPasswordBytes    = 72
	uniqueViolationCode = "23505"
	invalidLoginMessage = "invalid email or password"
)

// Auth handles owner accounts.
type Auth struct {
	queries   *db.Queries
	jwtSecret string
}

// NewAuth creates the owner account handlers.
func NewAuth(queries *db.Queries, jwtSecret string) *Auth {
	return &Auth{queries: queries, jwtSecret: jwtSecret}
}

type credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type ownerResponse struct {
	ID    uuid.UUID `json:"id"`
	Email string    `json:"email"`
}

type loginResponse struct {
	Token string `json:"token"`
}

// Register creates an owner account.
func (a *Auth) Register(w http.ResponseWriter, r *http.Request) {
	var input credentials
	if err := httpx.DecodeJSON(w, r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	email := normalizeEmail(input.Email)
	if !isValidEmail(email) {
		httpx.WriteError(w, http.StatusBadRequest, "invalid email")
		return
	}
	if len(input.Password) < minPasswordLength || len(input.Password) > maxPasswordBytes {
		httpx.WriteError(w, http.StatusBadRequest, "password must be 8 to 72 characters")
		return
	}

	hash, err := auth.HashPassword(input.Password)
	if err != nil {
		log.Printf("register: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	user, err := a.queries.CreateUser(r.Context(), db.CreateUserParams{Email: email, PasswordHash: hash})
	if isUniqueViolation(err) {
		httpx.WriteError(w, http.StatusConflict, "email already registered")
		return
	}
	if err != nil {
		log.Printf("register: create user: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, ownerResponse{ID: user.ID, Email: user.Email})
}

// Login exchanges owner credentials for a JWT.
func (a *Auth) Login(w http.ResponseWriter, r *http.Request) {
	var input credentials
	if err := httpx.DecodeJSON(w, r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := a.queries.GetUserByEmail(r.Context(), normalizeEmail(input.Email))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusUnauthorized, invalidLoginMessage)
		return
	}
	if err != nil {
		log.Printf("login: get user: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	matches, err := auth.CheckPassword(user.PasswordHash, input.Password)
	if err != nil {
		log.Printf("login: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if !matches {
		httpx.WriteError(w, http.StatusUnauthorized, invalidLoginMessage)
		return
	}

	token, err := auth.SignToken(user.ID, a.jwtSecret)
	if err != nil {
		log.Printf("login: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, loginResponse{Token: token})
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func isValidEmail(email string) bool {
	address, err := mail.ParseAddress(email)
	return err == nil && address.Address == email
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == uniqueViolationCode
}
