-- Phase 10.2 real Staff PIN authentication.
-- Do not execute automatically from the application.
-- Run only after phase-10-1-staff-foundation.sql has been reviewed/executed.
-- Do not seed staff users and do not store plain PINs.

alter table public.staff_members
add column if not exists employment_status text not null default 'active',
add column if not exists must_change_pin boolean not null default true,
add column if not exists pin_changed_at timestamptz,
add column if not exists archived_at timestamptz,
add column if not exists archive_reason text,
add column if not exists terminated_at timestamptz,
add column if not exists termination_reason text,
add column if not exists sessions_revoked_at timestamptz,
add column if not exists created_by_staff_id uuid references public.staff_members(id) on delete set null,
add column if not exists updated_by_staff_id uuid references public.staff_members(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'staff_members_employment_status_check'
      and conrelid = 'public.staff_members'::regclass
  ) then
    alter table public.staff_members
    add constraint staff_members_employment_status_check check (
      employment_status in (
        'active',
        'on_leave',
        'resigned',
        'terminated',
        'retired',
        'archived'
      )
    );
  end if;
end $$;

create table if not exists public.staff_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_member_id uuid not null references public.staff_members(id) on delete restrict,
  session_token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_reason text,
  ip_address text,
  user_agent text,
  device_name text
);

create table if not exists public.staff_auth_events (
  id uuid primary key default gen_random_uuid(),
  staff_member_id uuid references public.staff_members(id) on delete set null,
  employee_number text,
  event_type text not null,
  success boolean not null default false,
  ip_address text,
  user_agent text,
  failure_reason text,
  created_at timestamptz not null default now(),
  constraint staff_auth_events_event_type_check check (
    event_type in (
      'login_success',
      'login_failed',
      'logout',
      'session_expired',
      'session_revoked',
      'pin_reset',
      'pin_changed',
      'account_locked',
      'account_unlocked',
      'employee_deactivated',
      'employee_reactivated',
      'employee_archived'
    )
  )
);

create index if not exists staff_sessions_staff_member_id_idx
on public.staff_sessions(staff_member_id);

create index if not exists staff_sessions_session_token_hash_idx
on public.staff_sessions(session_token_hash);

create index if not exists staff_sessions_expires_at_idx
on public.staff_sessions(expires_at);

create index if not exists staff_sessions_revoked_at_idx
on public.staff_sessions(revoked_at);

create index if not exists staff_sessions_last_activity_at_idx
on public.staff_sessions(last_activity_at);

create index if not exists staff_auth_events_staff_member_id_idx
on public.staff_auth_events(staff_member_id);

create index if not exists staff_auth_events_employee_number_idx
on public.staff_auth_events(employee_number);

create index if not exists staff_auth_events_event_type_idx
on public.staff_auth_events(event_type);

create index if not exists staff_auth_events_created_at_idx
on public.staff_auth_events(created_at);

drop trigger if exists set_staff_sessions_updated_at on public.staff_sessions;
-- staff_sessions intentionally has no updated_at column; last_activity_at is
-- managed explicitly by the authentication service.

drop trigger if exists set_staff_members_updated_at on public.staff_members;
create trigger set_staff_members_updated_at
before update on public.staff_members
for each row execute function public.set_updated_at();
