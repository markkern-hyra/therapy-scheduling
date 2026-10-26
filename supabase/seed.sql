-- Сид-дані проєкту. Застосовується:
--   локально — під час `supabase db reset` (потрібен Docker);
--   у хмарі — лише з `supabase db push --include-seed` (звичайний db push сид не виконує).
--
-- Правила:
--   * лише синтетичні дані, email-и тільки *@example.test;
--   * файл має бути ІДЕМПОТЕНТНИМ: повторний запуск нічого не дублює
--     (insert ... on conflict do nothing / do update);
--   * користувачів Auth (auth.users) тут НЕ створюємо: їх створює
--     scripts/create-demo-users.mjs через Admin API (npm run users:demo)
--     за списком supabase/demo-users.json, а тригер on_auth_user_created додає профілі.
--
-- Приклад для довідкової таблиці, коли вона з'явиться у вашій міграції:
--   insert into public.departments (code, name)
--   values ('MATH', 'Кафедра математики'), ('LANG', 'Кафедра мов')
--   on conflict (code) do update set name = excluded.name;

-- Клієнти (AC-HOLD-16, AC-HOLD-34 спираються на client1@example.test). З міграції client_cards нова картка має дату
-- народження й мову (clients_intake_check).
insert into public.clients (kind, full_name, email, birth_date, language)
values
  ('adult', 'Client One', 'client1@example.test', '1985-04-12', 'English'),
  ('adult', 'Client Two', 'client2@example.test', '1979-09-30', 'Spanish')
on conflict (email) do nothing;

-- Демо-слоти терапевтів (міграція slots). На чистій базі терапевтів ще немає — нічого не створює; у хмарі слоти
-- створює npm run users:demo після користувачів.
select public.generate_demo_slots();
