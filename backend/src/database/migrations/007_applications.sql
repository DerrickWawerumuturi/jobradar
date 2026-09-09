
create table if not exists  application (
    id              bigint generated always as identity primary key,

    user_id         bigint not null references users(id) on delete  cascade,
    job_id          bigint not null  references jobs(id) on delete restrict,

    status          text not null default 'saved',
    applied_at      timestamptz,
    last_status_at  timestamptz not null default now(),

    title           text,
    company         text,
    source          text,
    next_action_at  timestamptz,
    match_score     numeric,
    cv_snapshot     jsonb,
    cover_letter    text,
    notes           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),

    constraint applications_user_job_key unique (user_id, job_id),
    constraint applications_status_check
        check (status in ('saved', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn') ),
    constraint applications_applied_at_check check (
        (status = 'saved' and applied_at is null) or (status <> 'saved' and applied_at is not null)),
    constraint applications_source_check check (
        (source is null) or source in ('company_site', 'linkedin', 'indeed', 'glassdoor','referral', 'other')
        )
);

create index if not exists application_user_status_idx
    on application (user_id, status, last_status_at desc );

create index if not exists  application_next_action_idx
    on application (user_id, next_action_at)
    where next_action_at is not null;

create table if not exists application_events(
    id              bigint generated always as identity primary key,
    application_id  bigint not null references application(id) on delete cascade,

    from_status     text,
    to_status       text not null,

    occurred_at     timestamptz not null default now(),
    recorded_at     timestamptz not null default now(),

    scheduled_for    timestamptz,
    note            text,

    constraint application_events_to_status_check check (
        to_status in ('saved', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn')),
    constraint application_events_from_status_check check (
        from_status is null or from_status in ('saved', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'))

);

create index if not exists application_events_application_idx
    on application_events(application_id, occurred_at desc );

create index if not exists application_events_scheduled_idx
    on application_events(scheduled_for)
    where scheduled_for is not null;