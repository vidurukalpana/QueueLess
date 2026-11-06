-- name: CreateQueue :one
INSERT INTO queues (owner_id, name, join_code)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ListQueuesByOwner :many
SELECT * FROM queues
WHERE owner_id = $1
ORDER BY created_at DESC;

-- name: GetQueue :one
SELECT * FROM queues
WHERE id = $1;

-- name: GetQueueForUpdate :one
SELECT * FROM queues
WHERE id = $1
FOR UPDATE;

-- name: UpdateQueue :one
UPDATE queues
SET status = COALESCE(sqlc.narg(status), status),
    allow_remote_join = COALESCE(sqlc.narg(allow_remote_join), allow_remote_join)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: UpdateJoinCode :one
UPDATE queues
SET join_code = $2
WHERE id = $1
RETURNING *;
