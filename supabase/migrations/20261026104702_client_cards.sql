-- Зріз 2, задача 1.1 impl-client-cards: користувач без ролі й картка клієнта з анкети.
-- AC: AC-CARD-01, 02, 03, 06, 07, 10, 11. Рішення — design.md impl-client-cards, розділ «Дані й RLS».

-- ── Набір ролей: «без ролі» (порядок drop-first з AGENTS.md) ────────────────────────────────────────────────────
-- Старий constraint не пропустив би null.
alter table public.profiles drop constraint profiles_role_check;
-- Дані: наявні ролі лишаються як є; без ролі — лише нові користувачі.
-- Новий default: тригер on_auth_user_created створює профіль без ролі — доступу немає, доки роль не дасть адміністратор
-- (AC-CARD-11). private.has_role для null дає false, тож користувач без ролі не проходить жодної політики.
alter table public.profiles alter column role drop not null;
alter table public.profiles alter column role set default null;
alter table public.profiles add constraint profiles_role_check
  check (role is null or role in ('admin', 'scheduler', 'therapist'));
-- Роль, як і раніше, не в grant update (лише full_name): змінити собі роль не може ніхто.

-- ── Картка з анкети ───────────────────────────────────────────────────────────────────────────────────────────
-- CHECK пропускає NULL, тож обов'язковість — явним `is not null`.
alter table public.clients alter column email drop not null; -- у дитини власного email немає
alter table public.clients
  add column kind text not null default 'adult'
    constraint clients_kind_check check (kind in ('adult', 'child')), -- картки зрізу 1 стають «Adult»
  add column birth_date date,
  add column language text,
  add column guardian_name text,
  add column guardian_email text;

-- Дорослий — власний email, без опікуна; дитина — без власного email (контакт — опікун).
alter table public.clients add constraint clients_contact_check check (
  (kind = 'adult' and email is not null and guardian_name is null and guardian_email is null)
  or (kind = 'child' and email is null)
);

-- Дитина: ім'я й коректний email опікуна (те саме правило формату, що й для клієнта — ADR 0003) (AC-CARD-03).
-- Один опікун може бути в картках кількох дітей, тож email опікуна не унікальний.
alter table public.clients add constraint clients_guardian_check check (
  kind = 'adult'
  or (
    guardian_name is not null
    and guardian_name ~ '[^[:space:]]'
    and guardian_email is not null
    and guardian_email = lower(btrim(guardian_email))
    and guardian_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);

-- Нова картка: дата народження не пізніше за сьогодні (за часом практики) і мова сеансів. not valid — правило для нових
-- рядків; картки зрізу 1 без цих полів лишаються дійсними («Not provided»). Дата в минулому з часом лишається в
-- минулому, тож відновлення дампу з цим check не впаде.
alter table public.clients add constraint clients_intake_check check (
  birth_date is not null
  and language is not null
  and birth_date <= (now() at time zone 'America/Los_Angeles')::date
  and language in ('English', 'Spanish')
) not valid;

-- Колонки анкети пише лише insert (admin, scheduler — політика clients_insert_staff); update і delete не видаємо:
-- картку не редагують (поза межами PM).
grant insert (kind, birth_date, language, guardian_name, guardian_email) on table public.clients to authenticated;

comment on table public.clients is
  'Картка клієнта з анкети: тип, ім''я, дата народження, мова; дорослий — email, дитина — ім''я й email опікуна. Створюють адміністратор і планувальник.';
