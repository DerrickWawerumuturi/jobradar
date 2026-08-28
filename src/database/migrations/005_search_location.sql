-- The search is no longer "three hardcoded countries", so what was actually
-- asked for has to be recorded alongside what came back. Without it, a thin
-- result set is indistinguishable from a thin market.

alter table searches add column if not exists country_code text;
alter table searches add column if not exists city         text;
alter table searches add column if not exists scopes       text[];
alter table searches add column if not exists widened      boolean not null default false;

create index if not exists searches_country_idx on searches (country_code, started_at desc);

-- Which regions a remote posting will hire from, as the provider states it.
alter table jobs add column if not exists remote_eligibility text;

comment on column searches.scopes is
    'Legs of the search, e.g. {local:ke, remote:global}. A fallback:* entry
     means the local market fell below the minimum-jobs floor.';
comment on column jobs.remote_eligibility is
    'Provider-stated hiring regions for a remote posting, e.g. "Worldwide" or
     "USA". Verbatim; eligibility is judged at query time, not stored.';
