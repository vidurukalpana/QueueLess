package handlers

import (
	"errors"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vidurukalpana/QueueLess/backend/internal/auth"
	"github.com/vidurukalpana/QueueLess/backend/internal/db"
	"github.com/vidurukalpana/QueueLess/backend/internal/email"
	"github.com/vidurukalpana/QueueLess/backend/internal/httpx"
	"github.com/vidurukalpana/QueueLess/backend/internal/middleware"
	"github.com/vidurukalpana/QueueLess/backend/internal/validate"
)

const (
	uniqueViolationCode = "23505"
	invalidLoginMessage = "invalid email or password"
)

// Auth handles owner accounts.
type Auth struct {
	pool        *pgxpool.Pool
	queries     *db.Queries
	jwtSecret   string
	sender      email.Sender
	frontendURL string
}

// NewAuth creates the owner account handlers.
func NewAuth(pool *pgxpool.Pool, queries *db.Queries, jwtSecret string, sender email.Sender, frontendURL string) *Auth {
	return &Auth{pool: pool, queries: queries, jwtSecret: jwtSecret, sender: sender, frontendURL: frontendURL}
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

	address, ok := validate.Email(input.Email)
	if !ok {
		httpx.WriteError(w, http.StatusBadRequest, "invalid email")
		return
	}
	if !validate.Password(input.Password) {
		httpx.WriteError(w, http.StatusBadRequest, "password must be 8 to 72 characters")
		return
	}

	hash, err := auth.HashPassword(input.Password)
	if err != nil {
		log.Printf("register: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	user, err := a.queries.CreateUser(r.Context(), db.CreateUserParams{Email: address, PasswordHash: hash})
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

	address, ok := validate.Email(input.Email)
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, invalidLoginMessage)
		return
	}

	user, err := a.queries.GetUserByEmail(r.Context(), address)
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

// Me returns the logged-in owner.
func (a *Auth) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := a.queries.GetUserByID(r.Context(), userID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err != nil {
		log.Printf("me: get user: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, ownerResponse{ID: user.ID, Email: user.Email})
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == uniqueViolationCode
}
