-- Swipe 2027 — migration 4 : mesure d'audience maison (visiteurs avec ou sans compte), visible dans /admin.html.
-- Aucun cookie, rien de stocké sur l'appareil. Un visiteur = empreinte (IP + navigateur) hachée côté serveur avec un sel,
-- renouvelée chaque jour : impossible de retrouver l'IP ou de suivre quelqu'un d'un jour à l'autre.
create table if not exists public.visites (
  jour date not null default current_date,
  v text not null,                                 -- empreinte hachée du jour
  connecte boolean not null default false,
  primary key (jour, v)
);
create table if not exists public.vues (           -- compteurs par onglet, sans identifiant
  jour date not null default current_date,
  vue text not null,
  n int not null default 0,
  primary key (jour, vue)
);
alter table public.visites enable row level security;   -- aucune policy : seul le serveur y accède
alter table public.vues enable row level security;

create or replace function public.track_visite(p_v text, p_connecte boolean, p_vue text) returns void
language sql security definer set search_path = public as $$
  insert into public.visites(jour, v, connecte) values (current_date, p_v, p_connecte)
    on conflict (jour, v) do update set connecte = public.visites.connecte or excluded.connecte;
  insert into public.vues(jour, vue, n) values (current_date, p_vue, 1)
    on conflict (jour, vue) do update set n = public.vues.n + 1;
$$;

create or replace function public.admin_visites() returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'jours', (select coalesce(jsonb_agg(d order by d.jour desc), '[]'::jsonb) from (
               select jour, count(*)::int as visiteurs, (count(*) filter (where connecte))::int as connectes
               from public.visites where jour > current_date - 30 group by jour) d),
    'vues',  (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
               select jour, vue, n from public.vues where jour > current_date - 30) x)
  ) $$;

-- Purge (CNIL : 13 mois maximum) : à lancer de temps en temps, ou via Database > Cron
create or replace function public.purge_visites() returns void language sql security definer set search_path = public as $$
  delete from public.visites where jour < current_date - interval '13 months';
  delete from public.vues where jour < current_date - interval '13 months' $$;

revoke execute on function public.track_visite(text, boolean, text), public.admin_visites(), public.purge_visites() from public, anon, authenticated;
grant execute on function public.track_visite(text, boolean, text), public.admin_visites(), public.purge_visites() to service_role;
