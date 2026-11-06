package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSignToken(t *testing.T) {
	const secret = "test-secret"
	userID := uuid.New()

	signed, err := SignToken(userID, secret)
	require.NoError(t, err)

	var claims jwt.RegisteredClaims
	_, err = jwt.ParseWithClaims(signed, &claims, func(*jwt.Token) (any, error) {
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	require.NoError(t, err)

	assert.Equal(t, userID.String(), claims.Subject)
	assert.WithinDuration(t, time.Now().Add(24*time.Hour), claims.ExpiresAt.Time, time.Minute)
}

func TestVerifyTokenAcceptsSignedToken(t *testing.T) {
	userID := uuid.New()
	signed, err := SignToken(userID, "test-secret")
	require.NoError(t, err)

	got, err := VerifyToken(signed, "test-secret")

	require.NoError(t, err)
	assert.Equal(t, userID, got)
}

func TestVerifyTokenRejectsBadTokens(t *testing.T) {
	const secret = "test-secret"
	valid := jwt.RegisteredClaims{
		Subject:   uuid.NewString(),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}
	expired := valid
	expired.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Hour))
	noExpiry := jwt.RegisteredClaims{Subject: uuid.NewString()}
	badSubject := valid
	badSubject.Subject = "not-a-uuid"

	tests := []struct {
		name   string
		method jwt.SigningMethod
		key    any
		claims jwt.RegisteredClaims
	}{
		{name: "wrong secret", method: jwt.SigningMethodHS256, key: []byte("other-secret"), claims: valid},
		{name: "expired", method: jwt.SigningMethodHS256, key: []byte(secret), claims: expired},
		{name: "no expiry", method: jwt.SigningMethodHS256, key: []byte(secret), claims: noExpiry},
		{name: "bad subject", method: jwt.SigningMethodHS256, key: []byte(secret), claims: badSubject},
		{name: "wrong algorithm", method: jwt.SigningMethodHS512, key: []byte(secret), claims: valid},
		{name: "unsigned", method: jwt.SigningMethodNone, key: jwt.UnsafeAllowNoneSignatureType, claims: valid},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			signed, err := jwt.NewWithClaims(test.method, test.claims).SignedString(test.key)
			require.NoError(t, err)

			_, err = VerifyToken(signed, secret)

			assert.Error(t, err)
		})
	}
}
