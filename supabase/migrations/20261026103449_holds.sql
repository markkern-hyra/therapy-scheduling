-- Зріз 1, задача 3.1: утримання слоту за клієнтом.
-- AC: AC-HOLD-01–04, 07, 08, 17, 18, 25, 26, 32, 33. Рішення — design.md impl-slot-hold (2–4), ADR 0001 і 0002.
-- Сеанс — це підтверджене утримання (confirmed_at), окремої таблиці сеансів немає. Статус не зберігаємо, а рахуємо з
-- часу: Confirmed, якщо confirmed_at; інакше Held, поки now() < expires_at; інакше Expired.

create table public.holds (
  id           uuid primary key default gen_random_uuid(),
  slot_id      uuid not null references public.slots (id) on delete cascade,
  client_id    uuid not null references public.clients (id) on delete cascade,
  -- Обидва моменти ставить тригер check_new_hold зі свого часу; клієнт їх не передає (GRANT лише на slot_id, client_id).
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '24 hours',
  confirmed_at timestamptz
);

create index holds_slot_id_idx on public.holds (slot_id);
create index holds_client_id_idx on public.holds (client_id);

comment on table public.holds is
  'Утримання слоту за клієнтом на 24 години; підтверджене (confirmed_at) — сеанс. Слот може мати багато утримань у часі, але не більше одного активного.';

-- «Активне» = Held або Confirmed на момент p_at. Одна формула для тригерів (їхній clock_timestamp) і RLS (now()).
create or replace function private.is_active_hold(p_confirmed_at timestamptz, p_expires_at timestamptz, p_at timestamptz)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_confirmed_at is not null or p_at < p_expires_at;
$$;

revoke execute on function private.is_active_hold(timestamptz, timestamptz, timestamptz) from public, anon;
grant execute on function private.is_active_hold(timestamptz, timestamptz, timestamptz) to authenticated;

-- ── Правила утримання — лише тут (рішення 4, ADR 0002) ────────────────────────────────────────────────────────────
-- before insert спрацьовує раніше за with check RLS, тож терапевт отримує впізнаваний код, а не «0 рядків».
-- security definer: правила бачать утримання всіх терапевтів і клієнтів, а не лише видимі користувачу.
create or replace function private.check_new_hold()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now   timestamptz;
  v_start timestamptz;
  v_end   timestamptz;
begin
  if not private.has_role('admin', 'scheduler') then
    raise exception 'HOLD_FORBIDDEN'; -- AC-HOLD-08
  end if;

  -- Завжди спершу клієнт, потім слот — без взаємних блокувань. Блокування серіалізує одночасні спроби: друга
  -- транзакція чекає на першу й після її коміту бачить нове утримання (AC-HOLD-04, 25).
  perform 1 from public.clients where id = new.client_id for update;
  select s.starts_at, s.ends_at into v_start, v_end from public.slots as s where s.id = new.slot_id for update;
  -- now() — час початку транзакції, а запит міг чекати на блокування.
  v_now := clock_timestamp();

  if exists (
    select 1 from public.holds as h
    where h.slot_id = new.slot_id and private.is_active_hold(h.confirmed_at, h.expires_at, v_now)
  ) then
    raise exception 'SLOT_TAKEN'; -- AC-HOLD-03, 04, 17
  end if;

  if v_start <= v_now then
    raise exception 'SLOT_STARTED'; -- AC-HOLD-07
  end if;

  -- Перетин — спільна хвилина; суміжні слоти не перетинаються. Прострочені не рахуються (AC-HOLD-25, 26).
  if exists (
    select 1 from public.holds as h
    join public.slots as s on s.id = h.slot_id
    where h.client_id = new.client_id
      and private.is_active_hold(h.confirmed_at, h.expires_at, v_now)
      and s.starts_at < v_end and s.ends_at > v_start
  ) then
    raise exception 'CLIENT_BUSY';
  end if;

  new.created_at := v_now;
  new.expires_at := v_now + interval '24 hours'; -- рівно 1440 хвилин і на переході на літній/зимовий час (AC-HOLD-02)
  new.confirmed_at := null;
  return new;
end;
$$;

revoke execute on function private.check_new_hold() from public, anon, authenticated;

create trigger holds_check_new
  before insert on public.holds
  for each row execute function private.check_new_hold();

-- ── Права ─────────────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.holds enable row level security;

revoke all on table public.holds from anon, authenticated;
grant select on table public.holds to authenticated;
grant insert (slot_id, client_id) on table public.holds to authenticated;
grant select, insert, update, delete on table public.holds to service_role;
-- update (підтвердження) — задача 4.1; delete не видаємо: утримання не скасовують раніше 24 годин (поза межами PM).

-- Планувальник і адміністратор бачать усі утримання й сеанси; терапевт — лише активні на власних слотах
-- (прострочене терапевту не видно вже на рівні бази, AC-HOLD-21).
create policy holds_select_staff_or_own_active
  on public.holds
  for select
  to authenticated
  using (
    (select private.has_role('admin', 'scheduler'))
    or (
      private.is_active_hold(confirmed_at, expires_at, now())
      and exists (
        select 1 from public.slots as s
        where s.id = holds.slot_id and s.therapist_id = (select auth.uid())
      )
    )
  );

create policy holds_insert_staff
  on public.holds
  for insert
  to authenticated
  with check ((select private.has_role('admin', 'scheduler')));
