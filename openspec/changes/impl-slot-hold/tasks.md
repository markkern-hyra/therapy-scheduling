# Tasks

Вертикальні задачі: кожна — міграція (за потреби) + доменна функція + server action / сторінка + тести
`it("AC-HOLD-NN: …")` + рядки `docs/conformance.md` → «реалізовано» в тому самому PR. Одна задача — одна гілка
`task/<коротко>` і PR «Реалізація». Перевірка кожної: `npm run lint`, `npm run typecheck`, `npm test`,
`npm run ac:coverage`; для міграції — зелений `db-check` у PR і `db-deploy` після merge. Принципи — розділ «Принципи»
`design.md`: правила запису лише в базі, спільне — в одному хелпері.

## 1. Ролі й клієнти

- [x] 1.1 Міграція ролей: `admin` / `scheduler` / `therapist` (зняти constraint → `member` → `therapist` → default
  `therapist` → новий constraint), `private.has_role(variadic text[])`, політика select профілів терапевтів для
  `scheduler`; міграція `clients` (`full_name` і `email` `not null`, check імені й формату email — ADR 0003, unique email
  у нижньому регістрі, GRANT insert `full_name`, `email` і RLS для admin / scheduler); `supabase/demo-users.json`
  (admin, scheduler1–2, therapist1–2); `src/lib/auth/roles.ts`, `src/lib/auth/require-role.ts` (`requireRole`),
  `src/lib/actions.ts` (`runAction`), `messages.ts` (мапа кодів, `errorCode`: `CLIENT_INVALID`, `CLIENT_EXISTS`),
  `clients.ts` (`normalizeEmail`), `ErrorMessage`; тексти `/` і `/login` англійською, перехід з `/` за роллю; сторінка
  `/clients` і `createClientCard`; `seed.sql` — client1, client2; ADR `docs/decisions/0003-valid-email.md`;
  `database.types.ts` з Summary `db-check`; тести; після merge `npm run users:demo` створює 5 користувачів із ролями.
  Done when: AC-HOLD-10, AC-HOLD-11, AC-HOLD-15, AC-HOLD-16, AC-HOLD-34, AC-HOLD-35.
- [x] 1.2 Уточнення клієнтів після відповідей PM (`clarify-slot-hold-2`): правило email уже в check-обмеженні
  (ADR 0003), прибирання пробілів імені — у формі й `clients_full_name_check`; тести: кожен із чотирьох email AC-HOLD-39
  і ім'я з пробілів / « Client Four » AC-HOLD-41 (тест бази на PGlite і `clients.ts`); рядки `docs/conformance.md`.
  Done when: AC-HOLD-39, AC-HOLD-41.

## 2. Слоти терапевта на день

- [x] 2.1 Міграція `slots` (60 хв, unique `therapist_id` + `starts_at`, RLS: admin / scheduler — усі, therapist — власні;
  запис лише `service_role`) і `public.generate_demo_slots()`; виклик із `scripts/create-demo-users.mjs`; `time.ts`
  (часовий пояс, формат, межі дня); `Badge` у `ui` і `StatusBadge` (статус → варіант, `DESIGN.md`); інфраструктура
  тестів бази `tests/db/supabase-pglite.ts` (PGlite) і тест RLS слотів; сторінка `/slots` (вибір терапевта й дня, слоти
  зі статусами вільний / «Past», «No free slots on this day.»); тести; після `npm run users:demo` у therapist1 і therapist2 є слоти
  пн–пт 09:00–16:00 за LA на 4 тижні.
  Done when: AC-HOLD-24.

## 3. Утримання

- [ ] 3.1 Міграція `holds` (колонки, `private.is_active_hold(confirmed_at, expires_at, at)`, GRANT insert `slot_id`,
  `client_id`, RLS: admin / scheduler — усі, therapist — власні активні) і тригер `private.check_new_hold`: блокування
  клієнта й слоту, потім `clock_timestamp()` для перевірок і `created_at` / `expires_at`, коди `HOLD_FORBIDDEN`,
  `SLOT_TAKEN`, `SLOT_STARTED`, `CLIENT_BUSY`; `status.ts` (статуси «Held», «Confirmed», «Expired», «Past», вільний;
  `isHoldable`); коди утримання в `messages.ts`; кнопка «Hold» з вибором клієнта й «Held until» на `/slots`,
  `holdSlot` (лише вхід, дозвіл — база) через `runAction`; ADR `docs/decisions/0001-session-is-confirmed-hold.md` і
  `0002-hold-rules-in-db-triggers.md`; тести, зокрема тести бази на PGlite для тригера й RLS; ручна перевірка: два
  вікна одночасно утримують той самий слот, therapist1 викликає `holdSlot` і прямий insert — бачить `HOLD_FORBIDDEN`.
  Done when: AC-HOLD-01, AC-HOLD-02, AC-HOLD-03, AC-HOLD-04, AC-HOLD-07, AC-HOLD-08, AC-HOLD-17, AC-HOLD-18, AC-HOLD-25,
  AC-HOLD-26, AC-HOLD-32, AC-HOLD-33.
- [ ] 3.2 Прострочення й список утримань: `visibility.ts` (`schedulerHolds` — лише «Held» і «Expired», слот яких ще не
  почався, за часом слоту від найближчого; прострочене зникає, коли слот знову утримали за тим самим клієнтом), сторінка
  `/holds` (клієнт, терапевт, слот, статус, «Held until»); слот простроченого утримання знову вільний на `/slots`; тести.
  Done when: AC-HOLD-05, AC-HOLD-06, AC-HOLD-20, AC-HOLD-28, AC-HOLD-29, AC-HOLD-37, AC-HOLD-38, AC-HOLD-42.

## 4. Підтвердження

- [ ] 4.1 Міграція: GRANT update `confirmed_at`, політика update `holds` для рядків, видимих у select, і тригер
  `private.check_hold_confirm` (`clock_timestamp()` після блокування рядка; `CONFIRM_FORBIDDEN`, `ALREADY_CONFIRMED`,
  `HOLD_EXPIRED`, `CONFIRM_STARTED`); коди підтвердження в `messages.ts`; кнопка «Confirm» на `/holds`, `confirmHold`
  (лише вхід, дозвіл — база) через `runAction`; тести, зокрема тести бази на PGlite для тригера; ручна перевірка: два
  планувальники одночасно підтверджують те саме утримання, therapist1 оновлює власне утримання прямим запитом — бачить
  `CONFIRM_FORBIDDEN`.
  Done when: AC-HOLD-12, AC-HOLD-13, AC-HOLD-14, AC-HOLD-19, AC-HOLD-22, AC-HOLD-23, AC-HOLD-27, AC-HOLD-36.

## 5. Розклад терапевта

- [ ] 5.1 Міграція: хелпер `private` і політика select `clients` для терапевта (клієнти власних активних утримань і
  сеансів; якщо її вже додала задача зрізу 2 `impl-client-cards` для AC-CARD-04, 05, 08 — беремо її); `time.ts`
  (`practiceWeek`, пн–нд за LA), `visibility.ts` (`therapistWeek`; клієнт — лише ім'я, без email); сторінка `/schedule`
  з перемиканням тижнів; тести, зокрема тест бази на PGlite для політики терапевта; ручна перевірка під therapist1 і
  therapist2.
  Done when: AC-HOLD-09, AC-HOLD-21, AC-HOLD-30, AC-HOLD-31, AC-HOLD-40.

## Workflow follow-up

- В останньому PR зрізу, до merge: `/opsx:verify`, `npm run ac:coverage` — усі 42 рядки `docs/conformance.md`
  «реалізовано» з кодом і тестом, потім `npx openspec archive impl-slot-hold -y`.
- Нові відповіді PM після `/requirements-sync` — нова зміна специфікації, потім окрема зміна реалізації.
