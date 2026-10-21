# Tasks

Вертикальні задачі: кожна — міграція (за потреби) + доменна функція + server action / сторінка + тести
`it("AC-HOLD-NN: …")` + рядки `docs/conformance.md` → «реалізовано» в тому самому PR. Одна задача — одна гілка
`task/<коротко>` і PR «Реалізація». Перевірка кожної: `npm run lint`, `npm run typecheck`, `npm test`,
`npm run ac:coverage`; для міграції — зелений `db-check` у PR і `db-deploy` після merge.

## 1. Ролі й демо-користувачі

- [ ] 1.1 Міграція ролей: `admin` / `scheduler` / `therapist` (зняти constraint → `member` → `therapist` → default
  `therapist` → новий constraint), політика select профілів терапевтів для `scheduler`; `supabase/demo-users.json`
  (admin, scheduler1–2, therapist1–2); `src/lib/scheduling/roles.ts`; тексти `/` і `/login` англійською, перехід з `/`
  за роллю; `database.types.ts` з Summary `db-check`.
  Done when: після merge `npm run users:demo` створює 5 користувачів із ролями; вхід scheduler1 веде на `/slots`,
  therapist1 — на `/schedule` (передумова для всіх AC зрізу).

## 2. Клієнти

- [ ] 2.1 Міграція `clients` (check імені й email, unique email у нижньому регістрі, GRANT insert `full_name`, `email` і
  RLS для admin / scheduler); `clients.ts` (`normalizeEmail`, `checkClient`), `messages.ts` (`CLIENT_INVALID`,
  `CLIENT_EXISTS`, `23505`); сторінка `/clients` і `createClientCard`; `seed.sql` — client1, client2; ADR
  `docs/decisions/0003-valid-email.md`; тести.
  Done when: AC-HOLD-10, AC-HOLD-11, AC-HOLD-15, AC-HOLD-16, AC-HOLD-34, AC-HOLD-35.

## 3. Слоти терапевта на день

- [ ] 3.1 Міграція `slots` (60 хв, unique `therapist_id` + `starts_at`, RLS: admin / scheduler — усі, therapist — власні;
  запис лише `service_role`) і `public.generate_demo_slots()`; виклик із `scripts/create-demo-users.mjs`; `time.ts`
  (часовий пояс, формат, межі дня); сторінка `/slots` (вибір терапевта й дня, слоти зі статусами вільний / «Past»,
  «No free slots on this day.»); тести.
  Done when: AC-HOLD-24; після `npm run users:demo` у therapist1 і therapist2 є слоти пн–пт 09:00–16:00 за LA на 4 тижні.

## 4. Утримання

- [ ] 4.1 Міграція `holds` (колонки, GRANT insert `slot_id`, `client_id`, RLS: admin / scheduler — усі, therapist —
  власні непрострочені) і тригер `private.check_new_hold` з блокуванням клієнта й слоту та кодами `HOLD_FORBIDDEN`,
  `SLOT_TAKEN`, `SLOT_STARTED`, `CLIENT_BUSY`; `status.ts` (статуси «Held», «Confirmed», «Expired», «Past», вільний),
  `holds.ts` (`checkHold`); кнопка «Hold» з вибором клієнта й «Held until» на `/slots`, `holdSlot`; ADR
  `docs/decisions/0001-session-is-confirmed-hold.md` і `0002-hold-rules-in-db-triggers.md`; тести; ручна
  перевірка: два вікна одночасно утримують той самий слот, therapist1 пробує утримати прямим запитом.
  Done when: AC-HOLD-01, AC-HOLD-02, AC-HOLD-03, AC-HOLD-04, AC-HOLD-07, AC-HOLD-08, AC-HOLD-17, AC-HOLD-18, AC-HOLD-25,
  AC-HOLD-26, AC-HOLD-32, AC-HOLD-33.
- [ ] 4.2 Прострочення й список утримань: `visibility.ts` (`schedulerHolds` — прострочене до початку слоту), сторінка
  `/holds` (клієнт, терапевт, слот, статус, «Held until»); слот простроченого утримання знову вільний на `/slots`; тести.
  Done when: AC-HOLD-05, AC-HOLD-06, AC-HOLD-20, AC-HOLD-28, AC-HOLD-29.

## 5. Підтвердження

- [ ] 5.1 Міграція: GRANT update `confirmed_at` і тригер `private.check_hold_confirm` (`CONFIRM_FORBIDDEN`,
  `ALREADY_CONFIRMED`, `HOLD_EXPIRED`, `CONFIRM_STARTED`); `checkConfirm`; кнопка «Confirm» на `/holds`, `confirmHold`;
  тести; ручна перевірка: два планувальники одночасно підтверджують те саме утримання, therapist1 — прямим запитом.
  Done when: AC-HOLD-12, AC-HOLD-13, AC-HOLD-14, AC-HOLD-19, AC-HOLD-22, AC-HOLD-23, AC-HOLD-27, AC-HOLD-36.

## 6. Розклад терапевта

- [ ] 6.1 Міграція: хелпер `private` і політика select `clients` для терапевта (клієнти власних непрострочених
  утримань і сеансів); `time.ts` (`practiceWeek`, пн–нд за LA), `visibility.ts` (`therapistWeek`); сторінка `/schedule`
  з перемиканням тижнів; тести; ручна перевірка під therapist1 і therapist2.
  Done when: AC-HOLD-09, AC-HOLD-21, AC-HOLD-30, AC-HOLD-31.

## 7. Матриця й закриття зрізу

- [ ] 7.1 Звірити `docs/conformance.md`: усі 36 рядків «реалізовано» з кодом і тестом; `/opsx:verify`;
  `npm run ac:coverage` — OK.
  Done when: `ac:coverage` показує 36 «реалізовано» без попереджень.

## Workflow follow-up

- `npx openspec archive impl-slot-hold -y` — в останньому PR зрізу, до merge.
- Нові відповіді PM після `/requirements-sync` — нова зміна специфікації, потім окрема зміна реалізації.
