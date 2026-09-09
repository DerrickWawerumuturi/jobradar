create table if not exists users (
    id          bigint generated always as identity primary key,

    sub         text not null,
    email       text,
    name        text,
    image       text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),

    constraint  users_sub_key unique (sub)

);

create table if not exists cvs(
    id          bigint generated always as identity primary key,

    user_id     bigint not null references users(id) on delete cascade,
    data        jsonb not null,
    updated_at  timestamptz not null default now(),

    constraint cvs_user_key unique (user_id) 

);