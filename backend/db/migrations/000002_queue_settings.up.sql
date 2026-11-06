ALTER TABLE queues
    ADD COLUMN allow_remote_join boolean NOT NULL DEFAULT true,
    ADD COLUMN join_code text NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
    ADD COLUMN max_waiting int;

ALTER TABLE queues
    ALTER COLUMN join_code DROP DEFAULT;

ALTER TABLE tickets
    ADD COLUMN checked_in_at timestamptz;
