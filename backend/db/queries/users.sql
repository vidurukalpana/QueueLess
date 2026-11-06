-- name: CreateUser :one
INSERT INTO users (email, password_hash)
VALUES ($1, $2)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1;

-- name: UpdateUserPassword :exec
UPDATE users
SET password_hash = $2
WHERE id = $1;

-- name: CreatePasswordReset :exec
INSERT INTO password_resets (user_id, token_hash, expires_at)
VALUES ($1, $2, now() + interval '1 hour');

-- name: GetValidPasswordReset :one
SELECT * FROM password_resets
WHERE token_hash = $1
  AND used_at IS NULL
  AND expires_at > now()
FOR UPDATE;

-- name: ExpirePasswordResets :exec
UPDATE password_resets
SET used_at = now()
WHERE user_id = $1
  AND used_at IS NULL;
