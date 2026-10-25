-- Spusťte celý soubor v SQL Editoru svého projektu Supabase.
-- Znovuspuštění zachová existující hlasy i nastavené heslo.
begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.votes (
  voter_token uuid primary key,
  pumpkin smallint not null check (pumpkin between 1 and 16),
  created_at timestamptz not null default now()
);

create table if not exists private.settings (
  singleton boolean primary key default true check (singleton),
  password_hash text not null
);

alter table private.votes enable row level security;
alter table private.settings enable row level security;
revoke all on private.votes, private.settings from public, anon, authenticated;

-- Jediná veřejná operace pro hlasující. Stejný token vždy vrátí původní
-- dýni, takže opakování požadavku po výpadku sítě nepřidá další hlas.
create or replace function public.submit_vote(p_pumpkin integer, p_voter_token uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare saved_pumpkin integer;
begin
  if p_pumpkin is null or p_pumpkin < 1 or p_pumpkin > 16 or p_voter_token is null then
    raise exception using errcode = '22023', message = 'Invalid vote';
  end if;
  insert into private.votes as v (voter_token, pumpkin)
  values (p_voter_token, p_pumpkin)
  on conflict (voter_token) do update set voter_token = excluded.voter_token
  returning v.pumpkin into saved_pumpkin;
  return saved_pumpkin;
end;
$$;

-- Ověření hesla probíhá výhradně na serveru. Klient nečte tabulky hlasů.
create or replace function public.admin_results(p_password text)
returns table (pumpkin integer, votes bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare expected_hash text;
begin
  if p_password is null or octet_length(p_password) > 72 then
    raise exception using errcode = '28000', message = 'Invalid password';
  end if;
  select s.password_hash into expected_hash from private.settings as s where s.singleton;
  if expected_hash is null or extensions.crypt(p_password, expected_hash) is distinct from expected_hash then
    raise exception using errcode = '28000', message = 'Invalid password';
  end if;
  return query
    select n.number, count(v.voter_token)
    from generate_series(1, 16) as n(number)
    left join private.votes as v on v.pumpkin = n.number
    group by n.number
    order by n.number;
end;
$$;

-- Pouze pro SQL Editor, nikdy pro web. Heslo se ukládá jako bcrypt hash.
create or replace function public.set_results_password(p_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- bcrypt používá nejvýše 72 bajtů; delší hesla nesmíme tiše zkrátit.
  if p_password is null or length(p_password) < 12 or octet_length(p_password) > 72 then
    raise exception using errcode = '22023', message = 'Use a password of at least 12 characters and at most 72 UTF-8 bytes';
  end if;
  insert into private.settings (singleton, password_hash)
  values (true, extensions.crypt(p_password, extensions.gen_salt('bf', 10)))
  on conflict (singleton) do update set password_hash = excluded.password_hash;
end;
$$;

revoke all on function public.submit_vote(integer, uuid) from public, anon, authenticated;
revoke all on function public.admin_results(text) from public, anon, authenticated;
revoke all on function public.set_results_password(text) from public, anon, authenticated;
grant execute on function public.submit_vote(integer, uuid) to anon, authenticated;
grant execute on function public.admin_results(text) to anon, authenticated;
grant execute on function public.set_results_password(text) to postgres;

commit;
