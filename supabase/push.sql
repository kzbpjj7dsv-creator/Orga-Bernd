-- Push-Benachrichtigungen: Hilfstabellen (nur für den Server lesbar) und Zeitplan alle 15 Minuten.
-- Die Werte in app_secrets (VAPID-Schlüssel, cron_secret) werden separat eingetragen und stehen NICHT im Repository.
create table if not exists app_secrets (key text primary key, value text not null);
alter table app_secrets enable row level security;            -- keine Policies => nur service_role
revoke all on app_secrets from anon, authenticated;

create table if not exists notification_log (
  user_id uuid not null references auth.users on delete cascade,
  key text not null,
  sent_at timestamptz default now(),
  primary key (user_id, key)
);
alter table notification_log enable row level security;
revoke all on notification_log from anon, authenticated;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('bernd-push') where exists (select 1 from cron.job where jobname = 'bernd-push');
select cron.schedule('bernd-push', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://dpuwdgqqcstjitrcfnmg.supabase.co/functions/v1/bernd-push',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-bernd-secret', (select value from public.app_secrets where key = 'cron_secret')),
    body := '{}'::jsonb)
$$);
