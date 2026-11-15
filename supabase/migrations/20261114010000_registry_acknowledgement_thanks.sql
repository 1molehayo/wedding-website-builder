-- Wedding-wide acknowledgement copy and the exact message sent per contribution.
-- The existing guest-confirmation email remains a separate fixed system email.

alter table public.weddings
  add column if not exists registry_thank_you_template text;

alter table public.weddings
  add constraint weddings_registry_thank_you_template_len
  check (
    registry_thank_you_template is null
    or char_length(registry_thank_you_template) between 1 and 2000
  );

alter table public.registry_contributions
  add column if not exists thank_you_message text,
  add column if not exists thank_you_sent_at timestamptz;

alter table public.registry_contributions
  add constraint registry_contributions_thank_you_message_len
  check (
    thank_you_message is null
    or char_length(thank_you_message) between 1 and 5000
  );

comment on column public.weddings.registry_thank_you_template is
  'Admin-editable acknowledgement sent after a contribution is first marked Received.';

comment on column public.registry_contributions.thank_you_message is
  'Exact rendered acknowledgement message sent for this contribution.';

comment on column public.registry_contributions.thank_you_sent_at is
  'When the admin-controlled acknowledgement was delivered. Non-null prevents duplicate sends.';
