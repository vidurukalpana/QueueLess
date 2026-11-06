-- name: CreateTicket :one
INSERT INTO tickets (queue_id, number, customer_name, token, checked_in_at)
VALUES (
    sqlc.arg(queue_id),
    sqlc.arg(number),
    sqlc.arg(customer_name),
    sqlc.arg(token),
    CASE WHEN sqlc.arg(checked_in)::boolean THEN now() END
)
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

-- name: CountWaitingTickets :one
SELECT COUNT(*)::int AS waiting
FROM tickets
WHERE queue_id = $1
  AND status = 'waiting';

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

-- name: AverageServiceMinutesToday :one
SELECT COALESCE(AVG(EXTRACT(EPOCH FROM done_at - called_at) / 60), 0)::float8 AS average_minutes
FROM tickets
WHERE queue_id = $1
  AND ticket_date = CURRENT_DATE
  AND status = 'done'
  AND called_at IS NOT NULL;

-- name: GetQueueStats :one
SELECT COUNT(*) FILTER (WHERE status = 'done')::int AS served,
       COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped,
       COUNT(*) FILTER (WHERE called_at IS NOT NULL)::int AS called,
       COALESCE(AVG(EXTRACT(EPOCH FROM called_at - created_at) / 60), 0)::float8 AS avg_wait_minutes,
       COALESCE(AVG(EXTRACT(EPOCH FROM done_at - called_at) / 60) FILTER (WHERE status = 'done'), 0)::float8 AS avg_service_minutes
FROM tickets
WHERE queue_id = sqlc.arg(queue_id)
  AND created_at::date = sqlc.arg(stats_date)::date;
