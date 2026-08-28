-- One row per analysis run, plus one row per upstream request it made.
-- Without this, an observation is uninterpretable: a job missing from a later
-- run may have closed, or our query may simply have changed.

create table if not exists searches (
    id            bigint generated always as identity primary key,
    query_json    jsonb not null,
    primary_role  text,
    location      text,
    remote        boolean,
    started_at    timestamptz not null,
    finished_at   timestamptz not null default now(),
    jobs_returned int
);

create index if not exists searches_started_idx on searches (started_at desc);

create table if not exists search_provider_runs (
    id             bigint generated always as identity primary key,
    search_id      bigint not null references searches(id) on delete cascade,
    provider       text not null,
    request_params jsonb,
    status         text not null,
    http_status    int,
    error          text,
    jobs_returned  int,
    duration_ms    int,

    constraint search_provider_runs_status_check
        check (status in ('ok', 'http_error', 'timeout', 'exception'))
);

create index if not exists search_provider_runs_search_idx
    on search_provider_runs (search_id);
create index if not exists search_provider_runs_provider_idx
    on search_provider_runs (provider, status);
