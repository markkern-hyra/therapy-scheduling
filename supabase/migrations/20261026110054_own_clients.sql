-- Зріз 2, задача 2.1 impl-client-cards: терапевт бачить картки лише своїх клієнтів.
-- AC: AC-CARD-04, 05, 08, 09. Рішення — design.md impl-client-cards («Дані й RLS»), ADR 0007.

-- «Свій клієнт» (глосарій PM): у клієнта з поточним терапевтом є утримання «Held» або сеанс «Confirmed», тобто активне
-- утримання на його слоті. Прострочене не рахується — картка зникає сама, без задачі за розкладом (AC-CARD-08).
-- security definer: читає holds і slots в обхід їхніх політик — «свій» залежить лише від умов цієї функції, а не від того,
-- що політики holds і slots колись покажуть терапевту; політика на них, що читатиме clients, не дасть рекурсії (42P17).
create or replace function private.is_own_client(p_client uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.holds as h
    join public.slots as s on s.id = h.slot_id
    where h.client_id = p_client
      and s.therapist_id = (select auth.uid())
      and private.is_active_hold(h.confirmed_at, h.expires_at, now())
  );
$$;

revoke execute on function private.is_own_client(uuid) from public, anon;
grant execute on function private.is_own_client(uuid) to authenticated;

-- Терапевт бачить картки (з усіма даними анкети й опікуна) лише своїх клієнтів; чужа чи прострочена — 0 рядків
-- (AC-CARD-04, 05, 08, 09). Запису для терапевта немає: insert — лише clients_insert_staff, update / delete не видано.
create policy clients_select_own_for_therapist
  on public.clients
  for select
  to authenticated
  using (
    (select private.has_role('therapist'))
    and private.is_own_client(id)
  );
