-- Tab schema — plain Postgres (Neon). Apply with psql or the Neon console.

create table if not exists tabs (
  code            text primary key,
  host_token      text not null,
  host_address    text not null,
  host_device_id  text,
  currency        text not null default 'USD',
  total_luna      bigint not null,
  fx_rate         numeric not null,
  title           text,
  status          text not null default 'open',
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null
);

create table if not exists shares (
  id           uuid primary key default gen_random_uuid(),
  tab_code     text not null references tabs(code) on delete cascade,
  "index"      int not null,
  label        text,
  amount_luna  bigint not null,
  memo         text not null,
  fingerprint  bigint not null,
  status       text not null default 'unpaid',
  tx_hash      text unique,
  paid_at      timestamptz,
  unique (tab_code, "index")
);

create table if not exists receipts (
  tab_code   text primary key references tabs(code) on delete cascade,
  canonical  text not null,
  signer     text not null,
  public_key text not null,
  signature  text not null,
  created_at timestamptz not null default now()
);

create table if not exists unmatched_txs (
  tx_hash      text primary key,
  tab_code     text not null references tabs(code) on delete cascade,
  value_luna   bigint not null,
  memo         text,
  seen_at      timestamptz not null default now()
);

create index if not exists idx_tabs_device_created on tabs (host_device_id, created_at);

-- Mutations go through the API routes only; the app connects with DATABASE_URL.
