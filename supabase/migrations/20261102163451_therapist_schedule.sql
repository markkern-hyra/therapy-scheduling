-- Задача 5.1 impl-slot-hold: розклад терапевта й сид доступності за припущенням PM. AC: AC-HOLD-09, 21, 30, 31, 40.

-- Ім'я клієнта в розкладі не через політику clients: після початку слоту утримання лишається «Held» до прострочення, а клієнт
-- уже не свій (AC-CARD-14), тож картку терапевт не бачить, а ім'я в розкладі — так. Функція віддає лише ім'я: email немає
-- в жодній колонці (AC-HOLD-40). Прострочені не показує (AC-HOLD-21); не терапевту — нічого (AC-CARD-11).
create or replace function private.therapist_schedule(p_from timestamptz, p_to timestamptz)
returns table (
  slot_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  confirmed_at timestamptz,
  expires_at timestamptz,
  client_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.starts_at, s.ends_at, h.confirmed_at, h.expires_at, c.full_name
  from public.slots as s
  left join public.holds as h
    on h.slot_id = s.id and private.is_active_hold(h.confirmed_at, h.expires_at, now())
  left join public.clients as c on c.id = h.client_id
  where s.therapist_id = (select auth.uid())
    and (select private.has_role('therapist'))
    and s.starts_at >= p_from
    and s.starts_at < p_to
  order by s.starts_at;
$$;

revoke execute on function private.therapist_schedule(timestamptz, timestamptz) from public, anon;
grant execute on function private.therapist_schedule(timestamptz, timestamptz) to authenticated;

-- Схема private не доступна через Data API, тому застосунок викликає цю обгортку.
create or replace function public.therapist_schedule(p_from timestamptz, p_to timestamptz)
returns table (
  slot_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  confirmed_at timestamptz,
  expires_at timestamptz,
  client_name text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.therapist_schedule(p_from, p_to);
$$;

revoke execute on function public.therapist_schedule(timestamptz, timestamptz) from public, anon;
grant execute on function public.therapist_schedule(timestamptz, timestamptz) to authenticated;

-- Припущення PM: пн–пт, перший слот о 09:00, останній о 16:00, на 8 тижнів уперед від сьогодні. Від понеділка поточного
-- тижня, щоб тиждень у розкладі не був порожнім на початку. Повторний виклик нічого не дублює.
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
           (now() at time zone 'America/Los_Angeles')::date + interval '55 days',
           interval '1 day'
         ) as d,
         generate_series(9, 16) as h
    where extract(isodow from d) <= 5
  ) as s
  where p.role = 'therapist'
  on conflict (therapist_id, starts_at) do nothing;
$$;
