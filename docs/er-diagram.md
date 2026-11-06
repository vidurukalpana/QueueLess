# QueueLess – ER Diagram

Final schema for the MVP. Columns marked `step 9` are added by the second migration.

```mermaid
erDiagram
    users ||--o{ queues : owns
    users ||--o{ password_resets : requests
    queues ||--o{ tickets : contains

    users {
        uuid id PK
        text email UK
        text password_hash "bcrypt hash"
        timestamptz created_at
    }

    password_resets {
        uuid id PK
        uuid user_id FK "references users.id"
        text token_hash UK "SHA-256 of the emailed token"
        timestamptz expires_at "1 hour after the request"
        timestamptz used_at "nullable"
        timestamptz created_at
    }

    queues {
        uuid id PK
        uuid owner_id FK "references users.id"
        text name
        text status "open, paused, closed"
        int avg_service_minutes "default 10"
        boolean allow_remote_join "default true, step 9"
        text join_code "secret code in the QR, step 9"
        int max_waiting "nullable, NULL means no limit, step 9"
        timestamptz created_at
    }

    tickets {
        uuid id PK
        uuid queue_id FK "references queues.id"
        date ticket_date "Sri Lanka date, default today"
        int number "restarts at 1 each day"
        text customer_name
        text status "waiting, called, done, skipped, cancelled"
        uuid token "secret held by the customer"
        timestamptz created_at
        timestamptz called_at "nullable"
        timestamptz checked_in_at "nullable, step 9"
        timestamptz done_at "nullable"
    }
```

## Relationships

| From | To | Cardinality | Meaning |
| --- | --- | --- | --- |
| `users` | `queues` | One to zero or many | An owner can run many queues; each queue has exactly one owner. |
| `queues` | `tickets` | One to zero or many | A queue holds many tickets; each ticket belongs to exactly one queue. |
| `users` | `password_resets` | One to zero or many | An owner can request reset links; each link belongs to exactly one owner. |

## Constraints

- `UNIQUE(queue_id, ticket_date, number)` on `tickets`, so numbers restart at 1 each Sri Lanka day.
- `waiting` or `called` tickets left from an earlier day become `cancelled`.
- `CHECK` constraints limit `queues.status` and `tickets.status` to the listed values.
- Index on `tickets(queue_id, status)`.
- All times are `timestamptz`, stored through connections running in `Asia/Colombo`.
