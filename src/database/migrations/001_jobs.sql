-- Source data only. Every column here is either identity, provenance, a value
-- the provider supplied verbatim, or a timestamp we own. Nothing in this table
-- is derived by JobRadar; derived data lives in job_skills and later tables.

create table if not exists jobs (
    id               bigint generated always as identity primary key,

    provider         text not null,
    external_id      text not null,
    identity_source  text not null,
    fingerprint      text not null,

    title            text,
    company          text,
    description      text,
    location         text,
    remote           boolean,
    employment_type  text,
    experience_level text,
    salary_min       numeric,
    salary_max       numeric,
    salary_currency  text,
    salary_period    text,
    url              text,
    posted_at        timestamptz,
    posted_at_raw    text,

    raw_payload      jsonb not null,
    payload_hash     text  not null,

    first_seen_at    timestamptz not null default now(),
    last_seen_at     timestamptz not null default now(),
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),

    constraint jobs_identity_key unique (provider, external_id),
    constraint jobs_identity_source_check
        check (identity_source in ('provider', 'fingerprint'))
);

create index if not exists jobs_last_seen_idx   on jobs (last_seen_at desc);
create index if not exists jobs_posted_at_idx   on jobs (posted_at desc nulls last);
create index if not exists jobs_provider_idx    on jobs (provider, first_seen_at desc);
create index if not exists jobs_fingerprint_idx on jobs (fingerprint);

comment on column jobs.external_id is
    'Provider job id, or ''fp:<sha256[:32]>'' when the provider gave none.';
comment on column jobs.fingerprint is
    'Hash of provider|company|title|location|url. Always computed, so its
     collision rate against real provider ids stays measurable.';
comment on column jobs.posted_at is
    'Absolute publication time. NULL when the provider only gave a relative
     string — see posted_at_raw. Not the same as first_seen_at.';
comment on column jobs.experience_level is
    'Provider-supplied only. Never inferred by JobRadar.';
