-- Swipe 2027 — schéma Supabase. À coller dans Supabase > SQL Editor > New query > Run.

-- 1. Réponses des utilisateurs connectés (une ligne par personne)
create table if not exists public.profils (
  user_id uuid primary key references auth.users(id) on delete cascade,
  swipes jsonb not null default '{}'::jsonb,   -- { mesureId: 1 | -1 | 0 }
  updated_at timestamptz not null default now()
);
alter table public.profils enable row level security;
create policy "lire son profil"     on public.profils for select using (auth.uid() = user_id);
create policy "créer son profil"    on public.profils for insert with check (auth.uid() = user_id);
create policy "modifier son profil" on public.profils for update using (auth.uid() = user_id);
create policy "supprimer son profil" on public.profils for delete using (auth.uid() = user_id);

-- 2. Fiches sourcées générées par l'IA, partagées avec tout le monde (lecture publique, écriture serveur)
create table if not exists public.fiches (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.fiches enable row level security;
create policy "fiches publiques" on public.fiches for select using (true);

-- 3. Verrous de génération (une seule génération à la fois par mesure)
create table if not exists public.verrous (id text primary key, pris_le timestamptz not null default now());
alter table public.verrous enable row level security;

create or replace function public.take_lock(p_id text) returns boolean
language plpgsql security definer as $$
begin
  delete from public.verrous where id = p_id and pris_le < now() - interval '3 minutes';
  insert into public.verrous(id) values (p_id);
  return true;
exception when unique_violation then return false;
end $$;

create or replace function public.release_lock(p_id text) returns void
language sql security definer as $$ delete from public.verrous where id = p_id $$;

-- 4. Quotas d'IA par IP hachée et par jour
create table if not exists public.usage (
  cle text not null, kind text not null, jour date not null default current_date, n int not null default 0,
  primary key (cle, kind, jour)
);
alter table public.usage enable row level security;

create or replace function public.bump_usage(p_key text, p_kind text, p_limit int) returns boolean
language plpgsql security definer as $$
declare v int;
begin
  insert into public.usage(cle, kind, jour, n) values (p_key, p_kind, current_date, 1)
  on conflict (cle, kind, jour) do update set n = public.usage.n + 1
  returning n into v;
  return v <= p_limit;
end $$;

-- Les fonctions ne sont appelables que par le serveur (clé service)
revoke execute on function public.take_lock(text), public.release_lock(text), public.bump_usage(text, text, int) from anon, authenticated;
