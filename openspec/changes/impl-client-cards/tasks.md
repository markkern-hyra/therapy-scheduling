# Tasks

Вертикальні задачі: міграція + дія + сторінка + тести `it("AC-CARD-NN: …")` + рядки `docs/conformance.md` →
«реалізовано» в тому самому PR. Одна задача — гілка `task/<коротко>` — PR «Реалізація». Перевірка кожної:
`npm run lint`, `typecheck`, `test`, `ac:coverage`, `check:design`, `check:boundary`; для міграції — `db-check` у PR і
`db-deploy` після merge. Задача 2 потребує утримань (задача 3.1 `impl-slot-hold`).

## 1. Картка з анкети й користувач без ролі

- [ ] 1.1 Міграція `client_cards`: набір ролей drop-first (`role` без ролі, `default null`), колонки анкети `clients`
  (`kind`, `birth_date`, `language`, `guardian_name`, `guardian_email`) з check-обмеженнями й `insert`-GRANT;
  `supabase/demo-users.json` — `newuser1@example.test` без ролі; `create-demo-users.mjs` приймає `role: null`;
  `requireRole` — роль `null` → `/no-access`; сторінки `/no-access`, `/clients` (усі картки), `/clients/new`
  (`ClientCardForm` з `useActionState`), `/clients/[id]`; `createClientCard` з `canCreateCards` до запису;
  `errorCode` за назвою обмеження; контакт клієнта у виборі під час утримання.
  - Тести бази (PGlite) на відмовні AC і незмінні дані: AC-CARD-03, 06, 07, 11, пастка «update own role»; логіка:
    `cardFromForm`, `canCreateCards`, `errorCode`.
  - Мутаційна перевірка: таблиця в PR; червоний прогін CI для AC-CARD-06 → revert.
  - Після merge — `npm run users:demo` (з дозволу людини).
  Done when: AC-CARD-01, AC-CARD-02, AC-CARD-03, AC-CARD-06, AC-CARD-07, AC-CARD-10, AC-CARD-11.

## 2. Свої клієнти терапевта

- [ ] 2.1 Міграція `own_clients`: `private.is_own_client` і політика `clients_select_own_for_therapist`; `/clients` для
  терапевта (свої клієнти, порожній стан AC-CARD-09), `/clients/[id]` — «You don't have access to this client.» для
  чужого чи простроченого; посилання «Clients» у навігації терапевта.
  - Тести бази (PGlite): AC-CARD-04, 05, 08, 09 (відмова і незмінна картка); логіка вибору тексту порожнього стану.
  - Мутаційна перевірка: таблиця в PR; червоний прогін CI для AC-CARD-05 → revert.
  - ADR 0006 «Доступ терапевта до карток — RLS-хелпер у базі, а не фільтр у коді» з «Як перевіряємо».
  Done when: AC-CARD-04, AC-CARD-05, AC-CARD-08, AC-CARD-09.

## Workflow follow-up

- В останньому PR зрізу: скріни за ролями (`docs/img/ws7-role-*`), `accounts.zip` актуальний, `/opsx:verify`,
  `npm run ac:coverage` — рядки AC-CARD «реалізовано», потім `npx openspec archive impl-client-cards -y`.
