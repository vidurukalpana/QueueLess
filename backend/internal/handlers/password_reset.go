package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/vidurukalpana/QueueLess/backend/internal/auth"
	"github.com/vidurukalpana/QueueLess/backend/internal/db"
	"github.com/vidurukalpana/QueueLess/backend/internal/email"
	"github.com/vidurukalpana/QueueLess/backend/internal/httpx"
	"github.com/vidurukalpana/QueueLess/backend/internal/validate"
)

const (
	resetEmailTimeout   = 15 * time.Second
	resetRequestMessage = "If that email is registered, a reset link has been sent."
	resetDoneMessage    = "Password changed."
	invalidResetMessage = "This reset link is invalid or has expired."
)

var errInvalidReset = errors.New("invalid reset token")

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

type resetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

type messageResponse struct {
	Message string `json:"message"`
}

// ForgotPassword sends a reset link. The reply never reveals if the email exists.
func (a *Auth) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var input forgotPasswordRequest
	if err := httpx.DecodeJSON(w, r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if address, ok := validate.Email(input.Email); ok {
		if err := a.startPasswordReset(r.Context(), address); err != nil {
			log.Printf("forgot password: %v", err)
			httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
			return
		}
	}

	httpx.WriteJSON(w, http.StatusOK, messageResponse{Message: resetRequestMessage})
}

func (a *Auth) startPasswordReset(ctx context.Context, address string) error {
	user, err := a.queries.GetUserByEmail(ctx, address)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("get user: %w", err)
	}

	token, hash, err := auth.NewResetToken()
	if err != nil {
		return err
	}

	err = inTx(ctx, a.pool, a.queries, func(queries *db.Queries) error {
		if err := queries.ExpirePasswordResets(ctx, user.ID); err != nil {
			return fmt.Errorf("expire older links: %w", err)
		}
		if err := queries.CreatePasswordReset(ctx, db.CreatePasswordResetParams{UserID: user.ID, TokenHash: hash}); err != nil {
			return fmt.Errorf("store reset: %w", err)
		}
		return nil
	})
	if err != nil {
		return err
	}

	// Sending in the background keeps the reply time the same for unknown emails.
	go a.sendResetEmail(context.WithoutCancel(ctx), address, token)
	return nil
}

func (a *Auth) sendResetEmail(ctx context.Context, address, token string) {
	ctx, cancel := context.WithTimeout(ctx, resetEmailTimeout)
	defer cancel()

	link := fmt.Sprintf("%s/reset-password?token=%s", a.frontendURL, url.QueryEscape(token))
	err := a.sender.Send(ctx, email.Message{
		To:      address,
		Subject: "Reset your QueueLess password",
		Text: "We received a request to reset your password.\n\n" +
			"Open this link within 1 hour:\n" + link + "\n\n" +
			"If this was not you, ignore this email. Your password has not changed.",
	})
	if err != nil {
		log.Printf("send reset email: %v", err)
	}
}

// ResetPassword changes the password using a one-time link.
func (a *Auth) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var input resetPasswordRequest
	if err := httpx.DecodeJSON(w, r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if !validate.Password(input.Password) {
		httpx.WriteError(w, http.StatusBadRequest, "password must be 8 to 72 characters")
		return
	}

	passwordHash, err := auth.HashPassword(input.Password)
	if err != nil {
		log.Printf("reset password: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	err = inTx(r.Context(), a.pool, a.queries, func(queries *db.Queries) error {
		reset, err := queries.GetValidPasswordReset(r.Context(), auth.HashResetToken(input.Token))
		if errors.Is(err, pgx.ErrNoRows) {
			return errInvalidReset
		}
		if err != nil {
			return fmt.Errorf("get reset: %w", err)
		}

		if err := queries.UpdateUserPassword(r.Context(), db.UpdateUserPasswordParams{ID: reset.UserID, PasswordHash: passwordHash}); err != nil {
			return fmt.Errorf("update password: %w", err)
		}
		if err := queries.ExpirePasswordResets(r.Context(), reset.UserID); err != nil {
			return fmt.Errorf("expire links: %w", err)
		}
		return nil
	})
	if errors.Is(err, errInvalidReset) {
		httpx.WriteError(w, http.StatusBadRequest, invalidResetMessage)
		return
	}
	if err != nil {
		log.Printf("reset password: %v", err)
		httpx.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, messageResponse{Message: resetDoneMessage})
}
