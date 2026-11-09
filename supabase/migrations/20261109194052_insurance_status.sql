-- Зріз 3, задачі 1.1 і 2.1 impl-insurance-status: статус перевірки страхування в картці клієнта.
-- AC: AC-INS-01…06. Рішення — design.md impl-insurance-status, рішення 1 і 2, розділ «Дані й RLS».

-- ── Статус — окремий рядок 1:1 до картки ─────────────────────────────────────────────────────────────────────────
-- Не колонка clients: clients_intake_check (not valid) діє на кожен update, тож update картки зрізу 1 без дати народження
-- й мови впав би, а статус є в кожній картці (Припущення PM). Рядка немає — «Not set» (AC-INS-01): «Not set» не можна
-- позначити й повернути, тому його немає серед значень check, а delete нікому не видано.
create table public.client_insurance (
  client_id uuid primary key references public.clients (id) on delete cascade,
  status    text not null
    constraint client_insurance_status_check check (status in ('verified', 'not_accepted', 'private_pay'))
);

comment on table public.client_insurance is
  'Статус перевірки страхування картки клієнта: Verified, Not accepted, Private pay; рядка немає — Not set. Позначають адміністратор і планувальник.';

alter table public.client_insurance enable row level security;

revoke all on table public.client_insurance from anon, authenticated;
grant select on table public.client_insurance to authenticated;
-- Колонкові grant: update змінює лише статус, а не картку, до якої він належить. delete не видано (AC-INS-05 і
-- Припущення PM: «Not set» не повертається).
grant insert (client_id, status) on table public.client_insurance to authenticated;
grant update (status) on table public.client_insurance to authenticated;
grant select, insert, update, delete on table public.client_insurance to service_role;

-- Хто бачить статус — ті, хто бачить картку: admin і scheduler — усі (AC-INS-03), терапевт — лише своїх клієнтів
-- (AC-INS-04; та сама умова, що в clients_select_own_for_therapist).
create policy client_insurance_select_visible
  on public.client_insurance
  for select
  to authenticated
  using (
    (select private.has_role('admin', 'scheduler'))
    or ((select private.has_role('therapist')) and private.is_own_client(client_id))
  );

-- Позначають лише admin і scheduler (матриця прав PM; AC-INS-02, 03). Терапевт — 42501 від with check політики insert
-- (і коли рядок уже є: запропонований рядок перевіряється до on conflict; update-політика — друга лінія), 0 рядків на
-- прямому update (AC-INS-05).
create policy client_insurance_insert_staff
  on public.client_insurance
  for insert
  to authenticated
  with check ((select private.has_role('admin', 'scheduler')));

create policy client_insurance_update_staff
  on public.client_insurance
  for update
  to authenticated
  using ((select private.has_role('admin', 'scheduler')))
  with check ((select private.has_role('admin', 'scheduler')));

-- ── Запис — одна інструкція від імені користувача ────────────────────────────────────────────────────────────────
-- Не upsert PostgREST: він пише client_id у do update set, а grant update — лише (status). security invoker: діють
-- права й політики того, хто викликає, тож функція нічого не дозволяє понад таблицю.
create function public.set_insurance_status(p_client_id uuid, p_status text)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.client_insurance (client_id, status)
  values (p_client_id, p_status)
  on conflict (client_id) do update set status = excluded.status;
$$;

-- Без входу — жодного доступу (AC-INS-06): функцію виконують лише authenticated.
revoke execute on function public.set_insurance_status(uuid, text) from public, anon;
grant execute on function public.set_insurance_status(uuid, text) to authenticated;
