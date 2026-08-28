-- One row per (job, search) sighting. Records exactly one fact: this job
-- appeared in this result set at this time. No provider tells us when a posting
-- closes, so 'seen' is the only honest status until one does.

create table if not exists job_observations (
    id              bigint generated always as identity primary key,
    job_id          bigint not null references jobs(id) on delete cascade,
    search_id       bigint references searches(id) on delete set null,
    provider        text not null,
    status          text not null default 'seen',
    observed_at     timestamptz not null default now(),
    result_rank     int,
    payload_hash    text not null,
    payload_changed boolean not null default false,
    raw_payload     jsonb,

    constraint job_observations_status_check check (status in ('seen'))
);

create index if not exists job_observations_job_idx
    on job_observations (job_id, observed_at desc);
create index if not exists job_observations_search_idx
    on job_observations (search_id);
create index if not exists job_observations_observed_idx
    on job_observations (observed_at desc);

comment on column job_observations.raw_payload is
    'Populated only when the payload differs from the previous sighting, so raw
     history is kept without storing an identical copy on every run.';
