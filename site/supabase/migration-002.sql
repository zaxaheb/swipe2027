-- Swipe 2027 — migration 2 : pseudos, consentement, journal des chats, tableau de bord.
-- À coller dans Supabase > SQL Editor > New query > Run (après schema.sql).

-- Pseudo et consentement dans le profil
alter table public.profils add column if not exists username text unique;
alter table public.profils add column if not exists consent_at timestamptz;

-- Journal anonyme des questions posées à l'IA (pas d'utilisateur, pas d'IP)
create table if not exists public.chats (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  mode text, mesure_id text, question text, reponse text, v text
);
alter table public.chats enable row level security;   -- aucune policy : seul le serveur y accède

-- Purge automatique (à lancer de temps en temps, ou via Database > Cron) : chats de plus de 12 mois
create or replace function public.purge_chats() returns void language sql security definer as $$
  delete from public.chats where created_at < now() - interval '12 months' $$;

-- Statistiques pour le tableau de bord
create or replace function public.admin_stats() returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'inscrits',        (select count(*) from auth.users),
    'inscrits_7j',     (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'profils_actifs',  (select count(*) from public.profils where swipes <> '{}'::jsonb),
    'reponses',        (select count(*) from public.profils p, jsonb_each_text(p.swipes)),
    'chats_total',     (select count(*) from public.chats),
    'chats_7j',        (select count(*) from public.chats where created_at > now() - interval '7 days'),
    'fiches',          (select count(*) from public.fiches),
    'top', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
              select key as id,
                     count(*) filter (where value = '1')  as pour,
                     count(*) filter (where value = '-1') as contre,
                     count(*) as vus
              from public.profils p, jsonb_each_text(p.swipes)
              group by key order by count(*) desc limit 400) t),
    'usage', (select coalesce(jsonb_agg(u order by u.jour), '[]'::jsonb) from (
              select jour, kind, sum(n)::int as n, count(*)::int as ips
              from public.usage where jour > current_date - 30 group by jour, kind) u)
  ) $$;

-- Sécurité : ces fonctions ne sont appelables que par le serveur (clé secrète)
revoke execute on function public.take_lock(text), public.release_lock(text), public.bump_usage(text, text, int),
  public.admin_stats(), public.purge_chats() from public, anon, authenticated;
grant execute on function public.take_lock(text), public.release_lock(text), public.bump_usage(text, text, int),
  public.admin_stats(), public.purge_chats() to service_role;
