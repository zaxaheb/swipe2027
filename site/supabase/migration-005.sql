-- Swipe 2027 — migration 5 : mesure des parcours dans l'app (version 2), pour comparer les façons de naviguer.
-- Seulement des compteurs par jour, sans aucun identifiant :
--   « t:accueil>mesure » = nombre de fois où quelqu'un est passé de l'accueil à une fiche ce jour-là ;
--   « e:parcours:etape:3 » = nombre de fois où la 3e question du parcours découverte a été atteinte ;
--   « e:recherche-vide:retraite-anticipee » = recherches qui n'ont rien trouvé (pour améliorer la recherche).
-- On ne peut pas reconstituer le chemin d'une personne : seuls les totaux sont gardés.
create table if not exists public.flux (
  jour date not null default current_date,
  cle text not null,
  n int not null default 0,
  primary key (jour, cle)
);
alter table public.flux enable row level security;   -- aucune policy : seul le serveur y accède

create or replace function public.track_flux(p jsonb) returns void
language sql security definer set search_path = public as $$
  insert into public.flux(jour, cle, n)
    select current_date, key, least(50, greatest(0, value::int)) from jsonb_each_text(p)
    where key ~ '^[te]:[a-z0-9:>_-]{1,60}$'
  on conflict (jour, cle) do update set n = public.flux.n + excluded.n;
$$;

create or replace function public.admin_flux(p_jours int default 30) returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('cle', cle, 'n', total) order by total desc), '[]'::jsonb)
  from (select cle, sum(n)::int as total from public.flux where jour > current_date - p_jours group by cle) x $$;

-- Purge (CNIL : 13 mois maximum)
create or replace function public.purge_flux() returns void language sql security definer set search_path = public as $$
  delete from public.flux where jour < current_date - interval '13 months' $$;
