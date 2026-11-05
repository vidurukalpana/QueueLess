# QueueLess – ER Diagram

Final schema for the MVP. Columns marked `step 9` are added by the second migration.

```mermaid
erDiagram
    users ||--o{ queues : owns
    queues ||--o{ tickets : contains

    users {
        uuid id PK
        text email UK
        text password_hash "bcrypt hash"
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
        int number "unique per queue"
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

## Constraints

- `UNIQUE(queue_id, number)` on `tickets`.
- `CHECK` constraints limit `queues.status` and `tickets.status` to the listed values.
- Index on `tickets(queue_id, status)`.
- All times are `timestamptz`, stored through connections running in `Asia/Colombo`.
