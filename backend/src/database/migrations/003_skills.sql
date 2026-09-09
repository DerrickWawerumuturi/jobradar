-- Derived data. Reproducible from jobs.raw_payload by re-running the extractor,
-- which is why extractor_version is part of the key: a future extractor can
-- reprocess history without destroying the output of the current one.

create table if not exists skills (
    id              bigint generated always as identity primary key,
    name            text not null,
    normalized_name text not null unique,
    emsi_skill_id   text,
    created_at      timestamptz not null default now()
);

create table if not exists job_skills (
    job_id            bigint not null references jobs(id) on delete cascade,
    skill_id          bigint not null references skills(id) on delete restrict,
    extractor_version text   not null,
    extracted_at      timestamptz not null default now(),

    primary key (job_id, skill_id, extractor_version)
);

create index if not exists job_skills_skill_idx
    on job_skills (skill_id, extracted_at);
create index if not exists job_skills_version_idx
    on job_skills (extractor_version);

comment on column skills.name is
    'Canonical EMSI name as SkillExtractor emits it, e.g. ''React.js''.';
comment on column skills.normalized_name is
    'lower(trim(name)). The join key, so casing differences cannot split a skill.';
comment on column skills.emsi_skill_id is
    'SKILL_DB key. Nullable: SkillExtractor currently discards the id it
     matched on and returns only the canonical name.';
