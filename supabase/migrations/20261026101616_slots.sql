-- Зріз 1, задача 2.1: слоти терапевтів і демо-слоти.
-- AC: AC-HOLD-24 (день без жодного слоту); основа для AC-HOLD-01, 18, 30–33. Рішення — design.md impl-slot-hold (2, 3, 10).

create table public.slots (
  id           uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.profiles (id) on delete cascade,
  starts_at    timestamptz not null,
  -- Кожен слот — 60 хвилин (Припущення PM).
  ends_at      timestamptz not null,
  constraint slots_duration_check check (ends_at = starts_at + interval '60 minutes'),
  constraint slots_therapist_starts_key unique (therapist_id, starts_at)
);

comment on table public.slots is
  'Слот доступності терапевта (60 хв). У зрізі 1 — лише демо-дані: створює generate_demo_slots() з npm run users:demo.';

alter table public.slots enable row level security;

revoke all on table public.slots from anon, authenticated;
grant select on table public.slots to authenticated;
grant select, insert, update, delete on table public.slots to service_role;
-- insert / update / delete для authenticated свідомо не видаємо: доступність терапевтів у застосунку не редагують (WS9).

-- Планувальник і адміністратор бачать слоти всіх терапевтів, терапевт — лише власні (матриця прав PM).
create policy slots_select_staff_or_own
  on public.slots
  for select
  to authenticated
  using (
    (select private.has_role('admin', 'scheduler'))
    or therapist_id = (select auth.uid())
  );

-- Демо-слоти: кожному терапевту пн–пт 09:00–16:00 за America/Los_Angeles (слоти 09:00…15:00) на поточний і 3 наступні
-- тижні. Межі рахує Postgres: місцевий час → timestamptz з урахуванням переходу на літній/зимовий час. Повторний виклик
-- нічого не дублює.
create or replace function public.generate_demo_slots()
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.slots (therapist_id, starts_at, ends_at)
  select p.id, s.starts_at, s.starts_at + interval '60 minutes'
  from public.profiles as p
  cross join lateral (
    select (d::date + make_interval(hours => h)) at time zone 'America/Los_Angeles' as starts_at
    from generate_series(
           date_trunc('week', now() at time zone 'America/Los_Angeles'),
           date_trunc('week', now() at time zone 'America/Los_Angeles') + interval '27 days',
           interval '1 day'
         ) as d,
         generate_series(9, 15) as h
    where extract(isodow from d) <= 5
  ) as s
  where p.role = 'therapist'
  on conflict (therapist_id, starts_at) do nothing;
$$;

-- Лише сервер (npm run users:demo із секретним ключем); Supabase за замовчуванням дає execute anon і authenticated.
revoke execute on function public.generate_demo_slots() from public, anon, authenticated;
grant execute on function public.generate_demo_slots() to service_role;
