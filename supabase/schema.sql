-- ============================================================
-- Bernd-App · Datenbank-Struktur (Supabase / PostgreSQL)
-- Einmal komplett im Supabase "SQL Editor" ausführen.
-- Jede Tabelle ist per Row Level Security geschützt:
-- Jede Person sieht und ändert nur ihre eigenen Daten.
-- ============================================================

-- ---------- Profil & Einstellungen ----------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  vorname text,
  settings jsonb not null default '{
    "zeitfenster": [["10:00","16:00"],["19:00","21:00"]],
    "zeitfenster_soft_ende": "15:30",
    "rhythmus": [45,5,45,20,45,5],
    "tagesmaximum_min": 360,
    "wochenende": true,
    "puffer_min": 30,
    "ruhezeit_bis": "13:00",
    "erinnerungen_tage": [7,3,1],
    "bernd_frechheit": 3,
    "schonmodus": false,
    "nachtmodus": "sonnenuntergang",
    "home_layout": ["bernd","arbeitsphase","heute","abgaben","cp"]
  }'::jsonb,
  bernd_outfit text default 'schal',
  bernd_freigeschaltet text[] default array['schal'],
  moodle_ical_url text,
  created_at timestamptz default now()
);

-- ---------- Studium ----------
create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  code text,                -- z. B. BMRD-03
  name text not null,
  semester int,
  cp numeric,
  gewicht numeric default 0, -- Gewicht für Gesamtnote laut BPO Anlage 4
  benotet boolean default true,
  pruefungsform text,       -- H, KO, ES, EP, K90, KN, PA, M, B, BA
  pauschal_angerechnet boolean default false,
  anwesenheit_erledigt boolean default false,
  note numeric,             -- Modulnote 1,0–5,0
  bestanden boolean,
  zulassungsrelevant boolean default false, -- BMRD-02/-03 für Sem. 5/6
  dozent jsonb default '{}'::jsonb,         -- {name, spruch, figur:{...}}
  moodle_url text,
  notizen text,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  module_id uuid references modules on delete cascade,
  titel text not null,
  art text,                 -- Hausarbeit, Komplexe Aufgabe, ...
  abgabe timestamptz,
  umfang_seiten int,
  seiten_geschrieben int default 0,
  schritte jsonb default '[]'::jsonb,       -- [{text, erledigt}]
  status text default 'offen',              -- offen | abgegeben | bewertet
  note numeric,
  feedback text,
  erinnerungen_tage int[] default array[7,3,1],
  created_at timestamptz default now()
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  liste text not null check (liste in ('studium','arbeit','praxisanleiter','privat','dlrg')),
  titel text not null,
  faellig date,
  wichtig boolean default false,
  erledigt boolean default false,
  module_id uuid references modules on delete set null,
  created_at timestamptz default now()
);

-- ---------- Kalender ----------
create table if not exists shift_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kuerzel text not null,    -- R24, KTW 3 Nacht, ...
  start_zeit time not null,
  ende_zeit time not null,  -- kleiner als start = über Mitternacht
  ruhezeit_danach boolean default false,
  farbe text
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  typ text not null check (typ in ('dienst','arbeitsphase','schule','uni','online','abgabe',
                                   'erste_hilfe','urlaub','sport','geburtstag','privat','dlrg','ruhezeit')),
  titel text,
  start_at timestamptz not null,
  ende_at timestamptz,
  ganztags boolean default false,
  ort text,
  wiederholung text,        -- iCal RRULE, z. B. FREQ=WEEKLY;BYDAY=TU
  shift_template_id uuid references shift_templates on delete set null,
  task_id uuid references tasks on delete set null,
  von_bernd boolean default false,
  quelle text default 'manuell', -- manuell | moodle | bernd
  created_at timestamptz default now()
);

create table if not exists work_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  task_id uuid references tasks on delete set null,
  module_id uuid references modules on delete set null,
  start_at timestamptz not null default now(),
  ende_at timestamptz,
  arbeit_min int default 0,
  abgebrochen boolean default false
);

-- ---------- Brainstorming ----------
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  text text not null,
  module_id uuid references modules on delete set null,
  created_at timestamptz default now()
);

create table if not exists research_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  idea_id uuid references ideas on delete cascade,
  schema text check (schema in ('PICO','ECLIPSE')),
  bausteine jsonb,          -- {P:..., I:..., C:..., O:...}
  frage text,
  favorit boolean default false,
  ki_protokoll jsonb,       -- Prompt + Antwort für Angabe der KI-Nutzung
  created_at timestamptz default now()
);

-- ---------- Nachschlagen ----------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  titel text not null,
  bereich text not null,    -- Rettungsdienst, Studium, ...
  stand date,
  storage_path text not null,
  inhalt jsonb default '[]'::jsonb, -- [{titel, seite, gruppe}]
  favoriten int[] default '{}',
  created_at timestamptz default now()
);

-- ---------- Finanzen, Stipendium, Steuern ----------
create table if not exists fixed_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  titel text not null,
  kategorie text not null,
  betrag numeric not null,
  intervall text default 'monatlich', -- monatlich | jaehrlich
  tag int default 1,
  gueltig_ab date default current_date,
  gueltig_bis date
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  art text not null check (art in ('einnahme','ausgabe')),
  betrag numeric not null,
  datum date not null default current_date,
  kategorie text,           -- Wohnen, Lebensmittel, ..., Geschenke, Studium
  quelle text,              -- bei Einnahmen: gehalt_rd, schule, erste_hilfe, ehrenamt, sonstiges
  titel text,
  notiz text,
  fixed_cost_id uuid references fixed_costs on delete set null,
  fuer_stipendium boolean default false,
  vom_stipendium_erstattet boolean default false,
  fuer_steuer boolean default false,
  steuer_kategorie text,    -- fahrtkosten, gebuehren, buecher, technik, sonstiges
  km numeric,
  beleg_path text,
  event_id uuid references events on delete set null,
  created_at timestamptz default now()
);

create table if not exists scholarship_docs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  semester text not null,   -- z. B. WS 2026/27
  ordner text not null check (ordner in ('buchung','zahlung','stunden')),
  titel text,
  storage_path text not null,
  created_at timestamptz default now()
);

-- ---------- Urlaub ----------
create table if not exists vacations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  reiseziel text not null,
  lat numeric, lon numeric,
  start_datum date not null,
  ende_datum date not null,
  event_id uuid references events on delete set null
);

create table if not exists vacation_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  vacation_id uuid not null references vacations on delete cascade,
  typ text not null check (typ in ('todo','pack')),
  kategorie text,
  text text not null,
  erledigt boolean default false
);

-- ---------- Push-Benachrichtigungen ----------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  geraet text,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security: nur eigene Daten
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['modules','tasks','todos','shift_templates','events','work_sessions',
    'ideas','research_questions','documents','fixed_costs','transactions','scholarship_docs',
    'vacations','vacation_items','push_subscriptions']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "eigene Daten" on %I', t);
    execute format('create policy "eigene Daten" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

alter table profiles enable row level security;
drop policy if exists "eigenes Profil" on profiles;
create policy "eigenes Profil" on profiles for all using (id = auth.uid()) with check (id = auth.uid());

-- Profil automatisch anlegen, wenn sich jemand registriert
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Dateiablage (privat): Belege, Nachschlagewerke, Bescheide
-- Pfad-Konvention: <user-id>/<dateiname>
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('belege','belege',false), ('nachschlagen','nachschlagen',false), ('bescheide','bescheide',false)
on conflict (id) do nothing;

drop policy if exists "eigene Dateien lesen" on storage.objects;
drop policy if exists "eigene Dateien schreiben" on storage.objects;
drop policy if exists "eigene Dateien ändern" on storage.objects;
drop policy if exists "eigene Dateien löschen" on storage.objects;
create policy "eigene Dateien lesen" on storage.objects for select
  using (bucket_id in ('belege','nachschlagen','bescheide') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "eigene Dateien schreiben" on storage.objects for insert
  with check (bucket_id in ('belege','nachschlagen','bescheide') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "eigene Dateien ändern" on storage.objects for update
  using (bucket_id in ('belege','nachschlagen','bescheide') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "eigene Dateien löschen" on storage.objects for delete
  using (bucket_id in ('belege','nachschlagen','bescheide') and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Zugriffsrechte für angemeldete Nutzer (neue Supabase-Projekte
-- vergeben diese nicht mehr automatisch). Die RLS-Regeln oben
-- sorgen weiterhin dafür, dass jede Person nur ihre Daten sieht.
-- ============================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------- Geschenkideen (zu Geburtstagen) ----------
create table if not exists gifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  event_id uuid references events on delete cascade,
  person text not null,
  idee text not null,
  budget numeric,
  link text,
  status text not null default 'idee' check (status in ('idee','gekauft','verpackt','verschenkt')),
  jahr int,
  notiz text,
  created_at timestamptz default now()
);
alter table gifts enable row level security;
drop policy if exists "eigene Daten" on gifts;
create policy "eigene Daten" on gifts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on gifts to authenticated;
grant all on gifts to service_role;

-- Private App: nach dem ersten Konto sind keine weiteren Registrierungen möglich
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create or replace function private.block_signups() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from auth.users) then
    raise exception 'Registrierung ist geschlossen. Diese App ist privat.';
  end if;
  return new;
end $$;
drop trigger if exists block_signups on auth.users;
create trigger block_signups before insert on auth.users for each row execute function private.block_signups();

-- ---------- Etappe 3: Einkauf, Packlisten, Zertifikate, Praxisanleiter, EH-Kurse, Karteikarten ----------
create table if not exists shopping_items (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, laden text not null, kategorie text, text text not null, menge text, erledigt boolean not null default false, created_at timestamptz default now());
create table if not exists shopping_favorites (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, laden text not null, kategorie text, text text not null, anzahl int not null default 1, unique (user_id, laden, text));
create table if not exists packlisten (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, kuerzel text not null, text text not null, sort int default 0, created_at timestamptz default now());
create table if not exists certificates (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, titel text not null, aussteller text, erworben date, gueltig_bis date, datei_path text, notiz text, created_at timestamptz default now());
create table if not exists pa_azubis (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, name text not null, jahr int, notiz text, aktiv boolean not null default true, created_at timestamptz default now());
create table if not exists pa_anleitungen (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, azubi_id uuid references pa_azubis on delete cascade, datum date not null default current_date, dauer_min int, thema text, notiz text, created_at timestamptz default now());
create table if not exists pa_fortbildungen (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, datum date not null default current_date, titel text not null, stunden numeric not null, datei_path text, created_at timestamptz default now());
create table if not exists eh_kurse (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, event_id uuid not null unique references events on delete cascade, teilnehmer int, honorar numeric, material jsonb not null default '[]'::jsonb, honorar_gebucht boolean not null default false, notiz text);
create table if not exists flashcards (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, module_id uuid references modules on delete cascade, vorne text not null, hinten text not null, box int not null default 1, faellig date not null default current_date, created_at timestamptz default now());
alter table profiles add column if not exists ical_token text unique;
-- RLS/Grants wie oben für alle neuen Tabellen; Bucket 'nachweise' analog zu den anderen Buckets.
