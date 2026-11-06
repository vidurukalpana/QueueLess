ALTER TABLE tickets
    DROP COLUMN checked_in_at;

ALTER TABLE queues
    DROP COLUMN max_waiting,
    DROP COLUMN join_code,
    DROP COLUMN allow_remote_join;
