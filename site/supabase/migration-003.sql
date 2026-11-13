-- Swipe 2027 — migration 3 : remarques des utilisateurs sur les fiches et les mesures.
create table if not exists public.remarques (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  mesure_id text not null,
  type text not null default 'autre',            -- erreur | source | point_de_vue | mesure | autre
  texte text not null,
  source_url text,
  user_id uuid references auth.users(id) on delete set null,
  statut text not null default 'nouveau'         -- nouveau | traite | rejete
);
alter table public.remarques enable row level security;  -- aucune policy : seul le serveur lit et écrit
create index if not exists remarques_statut on public.remarques(statut, created_at desc);

-- Anonymisation : le pseudo n'est plus copié dans les profils (il ne reste que l'identifiant technique).
update public.profils set username = null;
