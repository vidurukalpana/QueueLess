-- name: CreateTicket :one
INSERT INTO tickets (queue_id, number, customer_name, token)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: NextTicketNumber :one
SELECT (COALESCE(MAX(number), 0) + 1)::int AS next_number
FROM tickets
WHERE queue_id = $1
  AND ticket_date = CURRENT_DATE;

-- name: CancelStaleTickets :exec
UPDATE tickets
SET status = 'cancelled'
WHERE queue_id = $1
  AND ticket_date < CURRENT_DATE
  AND status IN ('waiting', 'called');

-- name: ListActiveTickets :many
SELECT * FROM tickets
WHERE queue_id = $1
  AND status IN ('waiting', 'called')
ORDER BY number;

-- name: GetTicket :one
SELECT * FROM tickets
WHERE id = $1;

-- name: UpdateTicketStatus :one
UPDATE tickets
SET status = sqlc.arg(status)::text,
    called_at = CASE WHEN sqlc.arg(status)::text = 'called' THEN now() ELSE called_at END,
    done_at = CASE WHEN sqlc.arg(status)::text = 'done' THEN now() ELSE done_at END
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: CompleteCalledTickets :exec
UPDATE tickets
SET status = 'done',
    done_at = now()
WHERE queue_id = $1
  AND status = 'called';

-- name: GetFirstWaitingTicket :one
SELECT * FROM tickets
WHERE queue_id = $1
  AND status = 'waiting'
ORDER BY number
LIMIT 1
FOR UPDATE;
