-- Copy live page content into an empty draft when the first backfill left [].

update public.weddings
set page_blocks_draft = page_blocks
where coalesce(page_blocks_draft, '[]'::jsonb) = '[]'::jsonb
  and page_blocks is not null
  and page_blocks <> '[]'::jsonb;
