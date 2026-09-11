-- Local only. Applied by `pnpm db:reset` and `pnpm db:seed`.
-- Never run against the cloud project (`pnpm db:seed` refuses non-local URLs).

insert into public.weddings (
  groom_name,
  bride_name,
  wedding_date,
  status,
  venue_location,
  dress_code,
  active_public_theme,
  public_slug
)
select
  'Marvelous',
  'Lillian',
  null,
  'planning',
  'Woodridge, Illinois · Chicago',
  'Formal attire',
  'celeste',
  'lillian-marvelous-2026'
where not exists (select 1 from public.weddings);

-- Restore starter home sections into draft only. Live stays empty until Publish.
-- Does not overwrite an existing draft.
with starter as (
  select jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'type', 'hero',
      'fields', jsonb_build_object(
        'title', null,
        'tagline', 'We''re getting married',
        'imagePath', null
      )
    ),
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'type', 'story',
      'fields', jsonb_build_object(
        'title', 'Our story',
        'body', 'We''re preparing the details of our celebration. Check back soon.'
      )
    ),
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'type', 'details',
      'fields', jsonb_build_object(
        'showVenue', true,
        'showDressCode', true
      )
    )
  ) as blocks
)
update public.weddings w
set
  page_blocks_draft = starter.blocks,
  page_draft_updated_at = now()
from starter
where w.public_slug = 'lillian-marvelous-2026'
  and coalesce(w.page_blocks, '[]'::jsonb) = '[]'::jsonb
  and coalesce(w.page_blocks_draft, '[]'::jsonb) = '[]'::jsonb;

