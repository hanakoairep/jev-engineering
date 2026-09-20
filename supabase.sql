-- Run once in Supabase SQL Editor for the Jev Engineering project.

-- 1. Who has access. Unique from day one, so duplicates cannot happen.
create table if not exists access_list (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);
alter table access_list enable row level security;

-- 2. USDT payments submitted from pay.html. The site can insert, nobody can read from the browser.
create table if not exists pending_payments (
  id bigint generated always as identity primary key,
  email text not null,
  network text not null check (network in ('erc20','bep20','polygon','arbitrum','trc20','sol')),
  tx_hash text not null unique,
  amount numeric not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
alter table pending_payments enable row level security;
create policy "site can submit payments" on pending_payments
  for insert to anon with check (status = 'pending');

-- 3. Access check used by the course page. Reads the email from the logged-in session.
create or replace function has_access() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from access_list where lower(email) = lower(auth.jwt() ->> 'email'));
$$;
revoke all on function has_access() from public;
grant execute on function has_access() to authenticated;

-- 4. Course chapters. Only logged-in buyers can read them; nothing ships inside the site files.
create table if not exists lessons (
  slug text primary key,
  part int not null,
  position int not null,
  n text not null,
  title text not null,
  summary text not null default '',
  minutes int not null default 0,
  builds text not null default '',
  html text not null default '',
  ready boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table lessons enable row level security;
create policy "buyers read lessons" on lessons for select to authenticated using (has_access());

-- Load or update chapters: run the generated lessons.sql from the course-content folder.

-- Daily routine -----------------------------------------------------------

-- See new crypto payments:
--   select * from pending_payments where status = 'pending' order by created_at;

-- After checking the hash on the block explorer, approve and grant access in one go:
--   with p as (update pending_payments set status = 'approved' where tx_hash = 'PASTE_HASH' returning email)
--   insert into access_list (email) select email from p on conflict (email) do nothing;

-- Card buyer (email from Stripe):
--   insert into access_list (email) values (lower('buyer@example.com')) on conflict (email) do nothing;
