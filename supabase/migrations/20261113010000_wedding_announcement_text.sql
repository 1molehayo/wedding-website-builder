-- Optional public-site announcement strip. Empty/null = hidden.

alter table public.weddings
  add column if not exists announcement_text text;
