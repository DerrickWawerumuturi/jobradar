-- Applications made outside JobRadar: no scanned job behind them, so job_id
-- goes nullable and the row carries its own url/location. unique(user_id,
-- job_id) treats nulls as distinct, so any number of manual rows is fine.

alter table application alter column job_id drop not null;

alter table application add column if not exists url text;
alter table application add column if not exists location text;

-- source now records provenance as free text (job provider, or 'manual') —
-- the fixed value list never matched what providers actually are.
alter table application drop constraint if exists applications_source_check;
