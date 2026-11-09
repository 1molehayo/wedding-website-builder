-- Store listings on a gift (Amazon first). A listing is a way out to pay
-- on that store. It does not change amount left; only contributions do.

create table public.registry_item_listings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.registry_items (id) on delete cascade,
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  provider text not null,
  url text not null,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registry_item_listings_provider_len check (
    char_length(trim(provider)) between 1 and 40
    and provider = lower(provider)
  ),
  constraint registry_item_listings_url_len check (
    char_length(url) between 8 and 2000
  ),
  constraint registry_item_listings_label_len check (
    char_length(trim(label)) between 1 and 80
  ),
  constraint registry_item_listings_item_provider_unique unique (item_id, provider)
);

create index registry_item_listings_wedding_id_idx
  on public.registry_item_listings (wedding_id, item_id);

create trigger registry_item_listings_set_updated_at
before update on public.registry_item_listings
for each row execute function public.set_updated_at();

create or replace function public.registry_item_listing_wedding_guard()
returns trigger
language plpgsql
as $$
declare
  item_wedding uuid;
begin
  select wedding_id into item_wedding
  from public.registry_items
  where id = new.item_id;

  if item_wedding is null then
    raise exception 'Gift not found for listing.';
  end if;

  if new.wedding_id is distinct from item_wedding then
    raise exception 'Listing wedding_id must match the gift.';
  end if;

  return new;
end;
$$;

create trigger registry_item_listings_wedding_guard
before insert or update of item_id, wedding_id
on public.registry_item_listings
for each row execute function public.registry_item_listing_wedding_guard();

comment on table public.registry_item_listings is
  'Ways out to pay on an external store for a gift. Does not affect remaining amount.';

alter table public.registry_item_listings enable row level security;

grant select, insert, update, delete on table public.registry_item_listings to service_role;
grant select, insert, update, delete on table public.registry_item_listings to authenticated;

create policy "Admins can select registry listings for their wedding"
on public.registry_item_listings
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

create policy "Admins can insert registry listings for their wedding"
on public.registry_item_listings
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

create policy "Admins can update registry listings for their wedding"
on public.registry_item_listings
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

create policy "Admins can delete registry listings for their wedding"
on public.registry_item_listings
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
