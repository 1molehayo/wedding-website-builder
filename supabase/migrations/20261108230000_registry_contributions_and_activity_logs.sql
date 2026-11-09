-- Bank-transfer registry ledger, plus append-only admin activity logs.
-- One contribution row is the only thing that changes a gift's remaining amount.
-- Bank-only secrets (confirm token, reminders) live on registry_contribution_bank.
-- Amazon and later stores insert registry_contributions with channel external_store.
-- This migration does not remove registry_reservations. The old soft reserve
-- stays until the guest contribute flow replaces it.

-- ---------------------------------------------------------------------------
-- Gift: optional browse link, optional photo.
-- ---------------------------------------------------------------------------
alter table public.registry_items
  alter column store_url drop not null;

alter table public.registry_items
  add column if not exists photo_path text;

comment on column public.registry_items.store_url is
  'Optional browse link for the gift. Not a payment URL.';

comment on column public.registry_items.photo_path is
  'Storage path in the photos bucket for the gift image.';

comment on table public.registry_reservations is
  'Legacy soft qty reserve. New gifts use registry_contributions. Do not add features here.';

-- ---------------------------------------------------------------------------
-- Prices the couple entered. These ratios are the exchange rate.
-- ---------------------------------------------------------------------------
create table public.registry_item_prices (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.registry_items (id) on delete cascade,
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  currency text not null,
  amount numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registry_item_prices_currency_len check (
    char_length(currency) between 3 and 12
    and currency = upper(currency)
  ),
  constraint registry_item_prices_amount_positive check (amount > 0),
  constraint registry_item_prices_item_currency_unique unique (item_id, currency)
);

create index registry_item_prices_wedding_id_idx
  on public.registry_item_prices (wedding_id, item_id);

create trigger registry_item_prices_set_updated_at
before update on public.registry_item_prices
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Contributions
-- ---------------------------------------------------------------------------
create type public.registry_contribution_channel as enum (
  'bank_transfer',
  'external_store'
);

create type public.registry_contribution_status as enum (
  'pending',
  'received',
  'not_received'
);

create table public.registry_contributions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  gift_id uuid references public.registry_items (id) on delete restrict,
  channel public.registry_contribution_channel not null,
  provider text,
  amount numeric(14, 2) not null,
  currency text not null,
  payer_name text not null,
  payer_email text not null,
  payer_phone text,
  status public.registry_contribution_status not null default 'pending',
  applied_at timestamptz,
  external_ref text,
  listing_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registry_contributions_amount_positive check (amount > 0),
  constraint registry_contributions_currency_len check (
    char_length(currency) between 3 and 12
    and currency = upper(currency)
  ),
  constraint registry_contributions_payer_name_len check (
    char_length(trim(payer_name)) between 1 and 120
  ),
  constraint registry_contributions_payer_email_len check (
    char_length(trim(payer_email)) between 3 and 200
  ),
  constraint registry_contributions_provider_channel check (
    (
      channel = 'bank_transfer'
      and provider is null
    )
    or (
      channel = 'external_store'
      and provider is not null
      and char_length(trim(provider)) between 1 and 40
    )
  )
);

create index registry_contributions_wedding_created_idx
  on public.registry_contributions (wedding_id, created_at desc);

create index registry_contributions_gift_id_idx
  on public.registry_contributions (gift_id)
  where gift_id is not null;

create index registry_contributions_status_idx
  on public.registry_contributions (wedding_id, status);

create trigger registry_contributions_set_updated_at
before update on public.registry_contributions
for each row execute function public.set_updated_at();

comment on table public.registry_contributions is
  'Ledger line that can reduce a gift. channel bank_transfer is the first writer. external_store (Amazon and later) uses the same row.';

comment on column public.registry_contributions.applied_at is
  'When set, and status is not not_received, this line reduces the gift. Null means it does not.';

comment on column public.registry_contributions.provider is
  'Null for bank_transfer. Store slug (amazon, …) for external_store.';

-- Gift and price rows must belong to the contribution wedding.
create or replace function public.registry_contribution_wedding_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  gift_wedding uuid;
begin
  if new.gift_id is not null then
    select wedding_id into gift_wedding
    from public.registry_items
    where id = new.gift_id;

    if gift_wedding is null or gift_wedding <> new.wedding_id then
      raise exception 'Gift does not belong to this wedding';
    end if;
  end if;

  return new;
end;
$$;

create trigger registry_contributions_wedding_guard
before insert or update of wedding_id, gift_id
on public.registry_contributions
for each row execute function public.registry_contribution_wedding_guard();

create or replace function public.registry_item_price_wedding_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  gift_wedding uuid;
begin
  select wedding_id into gift_wedding
  from public.registry_items
  where id = new.item_id;

  if gift_wedding is null or gift_wedding <> new.wedding_id then
    raise exception 'Price does not belong to this gift wedding';
  end if;

  return new;
end;
$$;

create trigger registry_item_prices_wedding_guard
before insert or update of item_id, wedding_id
on public.registry_item_prices
for each row execute function public.registry_item_price_wedding_guard();

-- ---------------------------------------------------------------------------
-- Bank-only detail. Confirm tokens never sit on an external-store row.
-- ---------------------------------------------------------------------------
create table public.registry_contribution_bank (
  contribution_id uuid primary key
    references public.registry_contributions (id) on delete cascade,
  account_id uuid not null references public.registry_accounts (id) on delete restrict,
  reference text not null,
  confirm_token text not null,
  reminder_count integer not null default 0,
  last_reminder_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registry_contribution_bank_reference_unique unique (reference),
  constraint registry_contribution_bank_confirm_token_unique unique (confirm_token),
  constraint registry_contribution_bank_reference_len check (
    char_length(reference) between 8 and 40
  ),
  constraint registry_contribution_bank_reminder_count check (
    reminder_count between 0 and 3
  )
);

create index registry_contribution_bank_account_id_idx
  on public.registry_contribution_bank (account_id);

create trigger registry_contribution_bank_set_updated_at
before update on public.registry_contribution_bank
for each row execute function public.set_updated_at();

comment on column public.registry_contribution_bank.confirm_token is
  'Secret link token. Server-only. Do not select this column into the admin UI or activity metadata.';

create or replace function public.registry_contribution_bank_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  contrib_channel public.registry_contribution_channel;
  contrib_wedding uuid;
  account_wedding uuid;
begin
  select channel, wedding_id
  into contrib_channel, contrib_wedding
  from public.registry_contributions
  where id = new.contribution_id;

  if contrib_channel is null then
    raise exception 'Contribution is missing';
  end if;

  if contrib_channel <> 'bank_transfer' then
    raise exception 'Bank detail is only for bank_transfer contributions';
  end if;

  select wedding_id into account_wedding
  from public.registry_accounts
  where id = new.account_id;

  if account_wedding is null or account_wedding <> contrib_wedding then
    raise exception 'Bank account does not belong to this wedding';
  end if;

  return new;
end;
$$;

create trigger registry_contribution_bank_guard
before insert or update of contribution_id, account_id
on public.registry_contribution_bank
for each row execute function public.registry_contribution_bank_guard();

-- ---------------------------------------------------------------------------
-- Activity logs. Append-only. Service role inserts. No update or delete grants.
-- ---------------------------------------------------------------------------
create type public.activity_actor_role as enum (
  'admin',
  'super_admin',
  'guest',
  'system'
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings (id) on delete cascade,
  actor_id uuid,
  actor_email text,
  actor_role public.activity_actor_role not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activity_logs_action_shape check (
    char_length(action) between 3 and 80
    and action ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'
  ),
  constraint activity_logs_entity_type_len check (
    char_length(entity_type) between 1 and 40
  ),
  constraint activity_logs_summary_len check (
    char_length(trim(summary)) between 1 and 280
  ),
  constraint activity_logs_actor_email_len check (
    actor_email is null or char_length(actor_email) <= 200
  )
);

create index activity_logs_wedding_created_idx
  on public.activity_logs (wedding_id, created_at desc);

create index activity_logs_created_idx
  on public.activity_logs (created_at desc);

comment on table public.activity_logs is
  'Append-only. Mutations and sends only. Never store secrets, confirm tokens, or full account numbers.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.registry_item_prices enable row level security;
alter table public.registry_contributions enable row level security;
alter table public.registry_contribution_bank enable row level security;
alter table public.activity_logs enable row level security;

grant select, insert, update, delete on table public.registry_item_prices to service_role;
grant select, insert, update, delete on table public.registry_contributions to service_role;
grant select, insert, update, delete on table public.registry_contribution_bank to service_role;
grant select, insert on table public.activity_logs to service_role;

grant select, insert, update, delete on table public.registry_item_prices to authenticated;
grant select, insert, update, delete on table public.registry_contributions to authenticated;

-- Authenticated reads of bank rows omit confirm_token.
grant select (
  contribution_id,
  account_id,
  reference,
  reminder_count,
  last_reminder_at,
  created_at,
  updated_at
) on table public.registry_contribution_bank to authenticated;

grant select on table public.activity_logs to authenticated;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
      and role = 'super_admin'
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

create policy "Admins can select registry prices for their wedding"
on public.registry_item_prices
for select
to authenticated
using (
  public.is_admin()
  and wedding_id in (
    select wedding_id
    from public.admin_profiles
    where id = auth.uid() and wedding_id is not null
  )
);

create policy "Admins can insert registry prices for their wedding"
on public.registry_item_prices
for insert
to authenticated
with check (
  public.is_admin()
  and wedding_id in (
    select wedding_id
    from public.admin_profiles
    where id = auth.uid() and wedding_id is not null
  )
);

create policy "Admins can update registry prices for their wedding"
on public.registry_item_prices
for update
to authenticated
using (
  public.is_admin()
  and wedding_id in (
    select wedding_id
    from public.admin_profiles
    where id = auth.uid() and wedding_id is not null
  )
)
with check (
  public.is_admin()
  and wedding_id in (
    select wedding_id
    from public.admin_profiles
    where id = auth.uid() and wedding_id is not null
  )
);

create policy "Admins can delete registry prices for their wedding"
on public.registry_item_prices
for delete
to authenticated
using (
  public.is_admin()
  and wedding_id in (
    select wedding_id
    from public.admin_profiles
    where id = auth.uid() and wedding_id is not null
  )
);

create policy "Admins can select registry contributions for their wedding"
on public.registry_contributions
for select
to authenticated
using (
  public.is_admin()
  and wedding_id in (
    select wedding_id
    from public.admin_profiles
    where id = auth.uid() and wedding_id is not null
  )
);

create policy "Admins can insert registry contributions for their wedding"
on public.registry_contributions
for insert
to authenticated
with check (
  public.is_admin()
  and wedding_id in (
    select wedding_id
    from public.admin_profiles
    where id = auth.uid() and wedding_id is not null
  )
);

create policy "Admins can update registry contributions for their wedding"
on public.registry_contributions
for update
to authenticated
using (
  public.is_admin()
  and wedding_id in (
    select wedding_id
    from public.admin_profiles
    where id = auth.uid() and wedding_id is not null
  )
)
with check (
  public.is_admin()
  and wedding_id in (
    select wedding_id
    from public.admin_profiles
    where id = auth.uid() and wedding_id is not null
  )
);

create policy "Admins can delete registry contributions for their wedding"
on public.registry_contributions
for delete
to authenticated
using (
  public.is_admin()
  and wedding_id in (
    select wedding_id
    from public.admin_profiles
    where id = auth.uid() and wedding_id is not null
  )
);

create policy "Admins can select bank detail for their wedding"
on public.registry_contribution_bank
for select
to authenticated
using (
  public.is_admin()
  and exists (
    select 1
    from public.registry_contributions as contribution
    where contribution.id = contribution_id
      and contribution.wedding_id in (
        select wedding_id
        from public.admin_profiles
        where id = auth.uid() and wedding_id is not null
      )
  )
);

create policy "Wedding admins can select their activity"
on public.activity_logs
for select
to authenticated
using (
  public.is_super_admin()
  or (
    public.is_admin()
    and wedding_id is not null
    and wedding_id in (
      select wedding_id
      from public.admin_profiles
      where id = auth.uid() and wedding_id is not null
    )
  )
);
