-- name: CreateQueue :one
INSERT INTO queues (owner_id, name)
VALUES ($1, $2)
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

-- name: UpdateQueueStatus :one
UPDATE queues
SET status = $2
WHERE id = $1
RETURNING *;
