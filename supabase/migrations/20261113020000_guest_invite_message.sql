-- Keep guest-facing invitation copy separate from private admin notes.
alter table public.guests
  add column if not exists invite_message text;

comment on column public.guests.invite_message is
  'Optional message shown to the guest in email and WhatsApp invitations.';
