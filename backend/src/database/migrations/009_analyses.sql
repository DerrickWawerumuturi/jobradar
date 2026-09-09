-- One stored market analysis per user, so a scan follows them across
-- browsers and devices the way the CV does. Newest scan replaces the last.

create table if not exists analyses (
    id          bigint generated always as identity primary key,
    user_id     bigint not null references users(id) on delete cascade,
    data        jsonb not null,
    file_name   text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),

    constraint analyses_user_key unique (user_id)
);
