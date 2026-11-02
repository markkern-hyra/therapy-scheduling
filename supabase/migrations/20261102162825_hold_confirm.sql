-- Задача 4.1 impl-slot-hold: підтвердження утримання. AC: AC-HOLD-12, 13, 14, 19, 22, 23, 27, 36.
-- Рішення — design.md impl-slot-hold, рішення 4: правила лише в тригері, прямий запит отримує ті самі відмови.
create or replace function private.check_hold_confirm()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now   timestamptz;
  v_start timestamptz;
begin
  -- Скрипти й тести ставлять минулі сеанси ключем service_role; через Data API цю роль не вибрати. Міграції (роль postgres)
  -- сюди не проходять: зміна даних підтвердження в міграції отримає CONFIRM_FORBIDDEN.
  if current_setting('role', true) = 'service_role' then
    return new;
  end if;

  if not private.has_role('admin', 'scheduler') then
    raise exception 'CONFIRM_FORBIDDEN'; -- AC-HOLD-14
  end if;

  -- Друге update чекає на блокування першого й бачить уже підтверджене: і для «в ту саму мить» (AC-HOLD-36).
  if old.confirmed_at is not null then
    raise exception 'ALREADY_CONFIRMED';
  end if;

  -- Той самий порядок блокувань, що в check_new_hold: спершу клієнт, потім слот. Інакше в мить прострочення слот міг би
  -- отримати і сеанс, і нове утримання. now() — час початку транзакції, а запит міг чекати на блокування.
  perform 1 from public.clients where id = old.client_id for update;
  select s.starts_at into v_start from public.slots as s where s.id = old.slot_id for update;
  v_now := clock_timestamp();
  if old.expires_at <= v_now then
    raise exception 'HOLD_EXPIRED'; -- AC-HOLD-13
  end if;

  if v_start <= v_now then
    raise exception 'CONFIRM_STARTED'; -- AC-HOLD-22, 23
  end if;

  new.confirmed_at := v_now; -- значення від клієнта ігноруємо
  return new;
end;
$$;

revoke execute on function private.check_hold_confirm() from public, anon, authenticated;

create trigger holds_check_confirm
  before update of confirmed_at on public.holds
  for each row execute function private.check_hold_confirm();

grant update (confirmed_at) on table public.holds to authenticated;

-- Update бачить ті самі рядки, що й select: терапевт на власному утриманні отримує CONFIRM_FORBIDDEN від тригера, а чуже
-- не знаходить взагалі. Дозвіл перевіряє тригер, тому with check не звужуємо.
create policy holds_update_visible
  on public.holds
  for update
  to authenticated
  using (
    (select private.has_role('admin', 'scheduler'))
    or (
      (select private.has_role('therapist'))
      and private.is_active_hold(confirmed_at, expires_at, now())
      and exists (
        select 1 from public.slots as s
        where s.id = holds.slot_id and s.therapist_id = (select auth.uid())
      )
    )
  )
  with check (true);
