-- Зріз 1, задача 1.1: ролі admin / scheduler / therapist і картки клієнтів.
-- AC: AC-HOLD-10, AC-HOLD-11, AC-HOLD-15, AC-HOLD-16, AC-HOLD-34, AC-HOLD-35. Рішення — design.md impl-slot-hold, ADR 0003.

-- ── Ролі ────────────────────────────────────────────────────────────────────
-- Порядок з AGENTS.md: старий constraint не пропустить нову роль (23514), а без нового default
-- тригер on_auth_user_created вставив би 'member' і впав на новому constraint.
alter table public.profiles drop constraint profiles_role_check;
update public.profiles set role = 'therapist' where role = 'member';
alter table public.profiles alter column role set default 'therapist'; -- найменші права
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'scheduler', 'therapist'));

-- Один вираз для всіх політик і тригерів замість повторюваного `current_app_role() in (…)`.
create or replace function private.has_role(variadic roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() = any (roles), false);
$$;

revoke execute on function private.has_role(text[]) from public, anon;
grant execute on function private.has_role(text[]) to authenticated;

-- Планувальник обирає терапевта (задача 2.1): бачить профілі терапевтів. Адміністратор бачить усі профілі вже
-- з політики шаблону profiles_select_own_or_admin; терапевт — лише власний.
create policy profiles_select_therapists_for_scheduler
  on public.profiles
  for select
  to authenticated
  using (
    role = 'therapist'
    and (select private.has_role('scheduler'))
  );

-- ── Клієнти ─────────────────────────────────────────────────────────────────
create table public.clients (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null
    constraint clients_full_name_check check (btrim(full_name) <> ''),
  -- Email зберігаємо вже нормалізованим (AC-HOLD-35), тож unique ловить і « Client1@Example.TEST » (AC-HOLD-34).
  -- Формат «valid email» — ADR 0003 (AC-HOLD-15).
  email      text not null
    constraint clients_email_key unique
    constraint clients_email_check check (
      email = lower(btrim(email))
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  created_at timestamptz not null default now()
);

comment on table public.clients is
  'Картка клієнта (зріз 1: лише ім''я та email). Створюють адміністратор і планувальник.';

alter table public.clients enable row level security;

revoke all on table public.clients from anon, authenticated;
grant select on table public.clients to authenticated;
-- Колонковий grant: id і created_at ставить база.
grant insert (full_name, email) on table public.clients to authenticated;
grant select, insert, update, delete on table public.clients to service_role;
-- update і delete для authenticated свідомо не видаємо: у зрізі 1 картку не редагують і не видаляють.

-- Терапевт побачить клієнтів власних утримань і сеансів окремою політикою в задачі 5.1.
create policy clients_select_staff
  on public.clients
  for select
  to authenticated
  using ((select private.has_role('admin', 'scheduler')));

create policy clients_insert_staff
  on public.clients
  for insert
  to authenticated
  with check ((select private.has_role('admin', 'scheduler')));
