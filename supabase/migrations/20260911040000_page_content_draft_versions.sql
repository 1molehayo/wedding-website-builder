-- Page content draft vs live, plus a capped publish history.

alter table public.weddings
  add column if not exists page_blocks_draft jsonb,
  add column if not exists page_draft_updated_at timestamptz,
  add column if not exists page_published_at timestamptz;

update public.weddings
set
  page_blocks_draft = coalesce(page_blocks_draft, page_blocks),
  page_draft_updated_at = coalesce(page_draft_updated_at, updated_at, now()),
  page_published_at = coalesce(page_published_at, updated_at, now())
where page_blocks_draft is null
   or page_published_at is null;

alter table public.weddings
  alter column page_blocks_draft set default '[]'::jsonb;

alter table public.weddings
  alter column page_blocks_draft set not null;

comment on column public.weddings.page_blocks is
  'Live home page blocks shown to guests.';
comment on column public.weddings.page_blocks_draft is
  'Admin working copy. Publish copies this onto page_blocks.';
comment on column public.weddings.page_published_at is
  'When page_blocks was last published. Null means never published.';

create table if not exists public.page_content_versions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  page_blocks jsonb not null,
  published_at timestamptz not null default now()
);

create index if not exists page_content_versions_wedding_published_idx
  on public.page_content_versions (wedding_id, published_at desc);

alter table public.page_content_versions enable row level security;

grant select, insert, update, delete on table public.page_content_versions to authenticated;
grant select, insert, update, delete on table public.page_content_versions to service_role;

create policy "Admins can select page content versions for their wedding"
on public.page_content_versions
for select
to authenticated
using (
  public.is_admin()
  and wedding_id in (
    select wedding_id
    from public.admin_profiles
    where id = auth.uid()
      and wedding_id is not null
  )
);

create policy "Admins can insert page content versions for their wedding"
on public.page_content_versions
for insert
to authenticated
with check (
  public.is_admin()
  and wedding_id in (
    select wedding_id
    from public.admin_profiles
    where id = auth.uid()
      and wedding_id is not null
  )
);

create policy "Admins can delete page content versions for their wedding"
on public.page_content_versions
for delete
to authenticated
using (
  public.is_admin()
  and wedding_id in (
    select wedding_id
    from public.admin_profiles
    where id = auth.uid()
      and wedding_id is not null
  )
);

-- Seed current live content as the first history row when none exist.
insert into public.page_content_versions (wedding_id, page_blocks, published_at)
select
  id,
  page_blocks,
  coalesce(page_published_at, updated_at, now())
from public.weddings
where not exists (
  select 1
  from public.page_content_versions v
  where v.wedding_id = weddings.id
);
