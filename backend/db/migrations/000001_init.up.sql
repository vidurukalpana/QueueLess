CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE queues (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES users (id),
    name text NOT NULL,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paused', 'closed')),
    avg_service_minutes int NOT NULL DEFAULT 10,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id uuid NOT NULL REFERENCES queues (id),
    ticket_date date NOT NULL DEFAULT CURRENT_DATE,
    number int NOT NULL,
    customer_name text NOT NULL,
    status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'done', 'skipped', 'cancelled')),
    token uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    called_at timestamptz,
    done_at timestamptz,
    UNIQUE (queue_id, ticket_date, number)
);

CREATE INDEX tickets_queue_id_status_idx ON tickets (queue_id, status);
