-- Run once in the Supabase SQL Editor after last_seen_at exists.
-- Requires pg_cron to already be enabled in Supabase.
-- Closes only b3_log_login rows whose heartbeat has been missing for at least one minute.
-- Keep this setup safe to re-run: replace only this named job.
select cron.unschedule(jobid)
from cron.job
where jobname = 'close-stale-login-logs-every-minute';

select cron.schedule(
  'close-stale-login-logs-every-minute',
  '* * * * *',
  $$
    update public.b3_log_login
    set
      tanggal_logout = ((last_seen_at + interval '1 minute') at time zone 'Asia/Jakarta')::date,
      waktu_logout = ((last_seen_at + interval '1 minute') at time zone 'Asia/Jakarta')::time
    where waktu_logout is null
      and last_seen_at is not null
      and last_seen_at <= now() - interval '1 minute';
  $$
);
