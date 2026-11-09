-- In-app admin notifications, fan-out from activity that wedding admins should see.

create table public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  wedding_id uuid references public.weddings (id) on delete cascade,
  activity_log_id uuid references public.activity_logs (id) on delete set null,
  action text not null,
  summary text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint admin_notifications_action_shape check (
    action ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'
  ),
  constraint admin_notifications_summary_len check (
    char_length(trim(summary)) between 1 and 280
  ),
  constraint admin_notifications_href_len check (
    href is null or char_length(href) <= 500
  )
);

create index admin_notifications_recipient_created_idx
  on public.admin_notifications (recipient_id, created_at desc);

create index admin_notifications_recipient_unread_idx
  on public.admin_notifications (recipient_id)
  where read_at is null;

comment on table public.admin_notifications is
  'Per-admin inbox rows. Created when a notify-worthy activity is recorded.';

alter table public.admin_notifications enable row level security;

-- App uses the service-role admin client for reads/writes. No authenticated policies.
grant select, insert, update, delete on table public.admin_notifications to service_role;
