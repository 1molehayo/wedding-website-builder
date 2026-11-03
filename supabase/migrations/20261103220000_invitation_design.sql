-- Persist the selected invitation design and a rendered card image for guest emails.

alter table public.weddings
  add column if not exists invitation_design_id text not null default 'wreath',
  add column if not exists invitation_design_mode text not null default 'light',
  add column if not exists invitation_card_path text;

alter table public.weddings
  drop constraint if exists weddings_invitation_design_mode_check;

alter table public.weddings
  add constraint weddings_invitation_design_mode_check
  check (invitation_design_mode in ('light', 'dark'));

comment on column public.weddings.invitation_design_id is
  'Selected e-invitation design id from the admin catalog.';

comment on column public.weddings.invitation_design_mode is
  'Light or dark rendering used for the invitation card preview and email image.';

comment on column public.weddings.invitation_card_path is
  'Storage path in the photos bucket for the rendered invitation PNG used in guest invite emails.';
