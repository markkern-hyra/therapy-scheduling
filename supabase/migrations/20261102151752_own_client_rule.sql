-- Задача 1.1 impl-client-cards-2: нове правило «Свій клієнт» і жодних даних без ролі.
-- AC: AC-CARD-04, 08, 11, 14. Рішення — design.md impl-client-cards-2, рішення 1 і 2; ADR 0007.

-- «Свій клієнт» (глосарій PM): у клієнта з поточним терапевтом є утримання «Held», слот якого ще не почався, або сеанс
-- «Confirmed», зокрема минулий. private.is_active_hold не міняємо: його використовують тригери й розклад, де утримання
-- лишається «Held» до прострочення (Припущення PM).
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
      and (h.confirmed_at is not null or (now() < h.expires_at and s.starts_at > now()))
  );
$$;

-- Без ролі — жодних даних (AC-CARD-11): «own»-гілки вимагають роль терапевта, як уже робить політика clients.
drop policy slots_select_staff_or_own on public.slots;
create policy slots_select_staff_or_own
  on public.slots
  for select
  to authenticated
  using (
    (select private.has_role('admin', 'scheduler'))
    or ((select private.has_role('therapist')) and therapist_id = (select auth.uid()))
  );

drop policy holds_select_staff_or_own_active on public.holds;
create policy holds_select_staff_or_own_active
  on public.holds
  for select
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
  );
