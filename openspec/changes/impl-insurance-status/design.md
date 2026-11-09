# Design: impl-insurance-status

## Context

- Специфікація: `openspec/specs/insurance-status/spec.md` (AC-INS-01…06).
- Що вже є: картка клієнта `/clients/[id]` (видимість карток — RLS `clients`, ADR 0007), `requireRole` (getClaims + роль
  з `profiles`, ADR 0006), `private.has_role`, `private.is_own_client`, `runAction`, `MESSAGES`, компоненти `Card`,
  `Choice`, `Alert`, `SubmitButton`, тести бази на PGlite (`tests/db`), SQL-мутанти (`scripts/mutants.mjs`), конвеєр UAT
  WS8 (`npm run uat`, `tests/e2e/support/`).
- Обмеження з наявної схеми: `clients_intake_check` створено `not valid` — він не перевіряє старі рядки, але діє на
  кожен update, тож update картки зрізу 1 без дати народження й мови впав би (міграція `client_cards`). Update карток
  `authenticated` взагалі не видано: картку не редагують (поза межами PM).

## Goals / Non-Goals

**Goals:** кожен AC — код, тест з AC ID, рядок матриці; на кожну відмову — тест бази (PGlite) і SQL-мутант `KILLED`;
UAT-специфікація з дослівним «Тоді» на кожен AC.

**Non-Goals:** історія змін статусу, поліс і суми, вплив статусу на утримання, фільтр за статусом (поза межами PM);
документи згоди (#34, пізніший зріз).

## Decisions

### 1. Статус — окрема таблиця 1:1, а не колонка `clients` (AC-INS-01, 02, 03)

`public.client_insurance (client_id uuid primary key references public.clients (id) on delete cascade, status text not
null check (status in ('verified', 'not_accepted', 'private_pay')))`. Рядка немає — «Not set».

- Колонка в `clients` вимагала б update рядка картки, а `clients_intake_check` (`not valid`) відхилив би update кожної
  картки зрізу 1 без дати народження й мови. PM: статус є в кожній картці, зокрема зі зрізів 1–2 («Припущення»).
- Окремий рядок не відкриває update картки: колонки анкети, як і раніше, пише лише insert.
- «Not set» не зберігаємо: його не можна позначити й не можна повернути («Припущення»). Check пропускає лише три
  значення, а delete не видано, тож повернути «Not set» не можна ні на сторінці, ні прямим запитом.
- Історії «хто й коли» немає (поза межами PM), тож лише остання позначка, без `updated_at` / `updated_by`.

### 2. Запис — функція `public.set_insurance_status`, `security invoker` (AC-INS-02, 03, 05)

`supabase.rpc("set_insurance_status", { p_client_id, p_status })` → `insert … on conflict (client_id) do update set
status = excluded.status`: одна інструкція, одна транзакція, права й RLS — користувача, що викликає (`security invoker`,
`set search_path = ''`).

- Чому не `.from("client_insurance").upsert(…)`: PostgREST пише в `do update set` усі колонки тіла, зокрема
  `client_id`, тож колонковий `grant update (status)` відхилив би запис планувальника (`42501`; знайшов тест-спершу на
  PGlite). Розширити grant до `update (client_id, …)` означало б дати змінювати власника рядка — функція тримає grant
  вузьким.
- `execute` — лише `authenticated` (`revoke … from public, anon`). Терапевт, що викликає функцію напряму, упирається в
  ті самі політики insert / update — `42501`, статус не змінено.
- Одночасні позначки двох планувальників дають останню (історії немає).

### 3. Повідомлення про успіх — `?notice=` у `runAction` (AC-INS-02)

`runAction(write, back, notice?)`: після успішного запису додає `?notice=<КОД>`, після помилки — `?error=<КОД>`, як
досі. `MESSAGES.INSURANCE_SAVED = "Insurance status saved."`. Сторінка показує повідомлення лише після дії: повторне
відкриття картки (без `?notice=`) показує лише статус — так AC-INS-02 перевіряє і повідомлення, і «після того, як
відкриє знову».

### 4. Текст статусу — чиста функція (AC-INS-01…04)

`src/lib/scheduling/insurance.ts`: `INSURANCE_STATUSES` (значення й підписи «Verified», «Not accepted», «Private pay»)
і `insuranceLine(status | null)` → «Insurance: Not set» / «Insurance: Verified» … Файл — під підлогою покриття
(`vitest.coverage.config.mts`, `FLOORED`).

## UI і компоненти

| Що | Рішення | AC |
|---|---|---|
| Рядок статусу | у картці — `Card title="Insurance"` з рядком «Insurance: <статус>» текстом (не лише кольором), однаково для всіх ролей | AC-INS-01, 03, 04 |
| Позначка | лише для `admin` і `scheduler` (`isStaff`): `<fieldset>` з `<legend>` «Insurance status», три `Choice` (поточний обраний), `SubmitButton` «Save insurance status» (`primary` — одна основна дія картки, під час надсилання «Saving…») | AC-INS-02, 03 |
| Терапевт | лише рядок статусу, форми немає (недоступну дію не показуємо, `DESIGN.md`, розділ 6) | AC-INS-04 |
| Повідомлення | `Alert variant="success"` — новий варіант: `role="status"`, тло `primary-soft`, текст `card-foreground` (контраст 14.0 / 11.6 — `DESIGN.md`, розділ 2), над карткою; рядок у `DESIGN.md`, розділи 5 і 6 | AC-INS-02 |
| Без входу | без змін: `requireRole` → `/login` до будь-якого запиту даних | AC-INS-06 |

## Дані й RLS

Міграція `insurance_status` (одна, нова):

| Що | Рішення | AC |
|---|---|---|
| RLS | `enable row level security`; `revoke all … from anon, authenticated` | AC-INS-05, 06 |
| GRANT | `select` і `insert (client_id, status)`, `update (status)` — `authenticated`; `delete` не видано; `service_role` — усе (UAT-прибирання й сид); `execute` функції `set_insurance_status` — лише `authenticated` | AC-INS-02, 05, 06 |
| `client_insurance_select_visible` | `select`: `has_role('admin','scheduler')` або (`has_role('therapist')` і `private.is_own_client(client_id)`) — та сама видимість, що в картки | AC-INS-01, 03, 04 |
| `client_insurance_insert_staff` | `insert with check (has_role('admin','scheduler'))` | AC-INS-02, 05 |
| `client_insurance_update_staff` | `update using (has_role('admin','scheduler')) with check (has_role('admin','scheduler'))` | AC-INS-03, 05 |
| Анонім | жодного grant: `anon` отримує `42501` | AC-INS-06 |

Функція для терапевта: без рядка — `with check` політики insert, з рядком — `using` політики update на гілці
`on conflict` (Postgres кидає помилку, а не пропускає рядок) — в обох випадках `42501`, рядок не змінено. Прямий
`update` таблиці терапевтом — 0 рядків (політика update його не пропускає); анонім не має ні grant на таблицю, ні
`execute` функції.

## Auth

| Де | Перевірка | AC |
|---|---|---|
| `setInsuranceStatus` (server action, `src/app/clients/actions.ts`) | `requireRole()` (getClaims → роль з `profiles`) до запису; не `isStaff` — без виклику `set_insurance_status`, назад на картку | AC-INS-05 |
| База | політики insert / update лише для staff — відмова й на прямий запит в обхід дії та сторінок | AC-INS-05 |
| Сторінка картки | `requireRole()` — без входу `/login`; форма лише для `isStaff` | AC-INS-04, 06 |

## Тести й доказ, що тест здатен упасти

| AC | Рівень | Тест | Доказ, що падає |
|---|---|---|---|
| AC-INS-01 | unit + база + e2e | `tests/scheduling/insurance.test.ts`, `tests/db/insurance.test.ts`, `tests/e2e/insurance.spec.ts` | — (стан) |
| AC-INS-02 | база + дія + e2e | `tests/db/insurance.test.ts`, `tests/scheduling/insurance-action.test.ts`, `tests/e2e/insurance.spec.ts` | — |
| AC-INS-03 | база + e2e | `tests/db/insurance.test.ts`, `tests/e2e/insurance.spec.ts` | — |
| AC-INS-04 | база + e2e | `tests/db/insurance.test.ts` (терапевт читає статус свого клієнта, чужого — ні), `tests/e2e/insurance.spec.ts` | SQL-мутант: select без `is_own_client` |
| AC-INS-05 | база + дія + e2e | `tests/db/insurance.test.ts` (`asUser` therapist1: функція, insert, update), `tests/scheduling/insurance-action.test.ts` | SQL-мутанти: `with check (true)` у insert і update, `therapist` у ролях |
| AC-INS-06 | база + e2e | `tests/db/insurance.test.ts` (`asAnon`), `tests/e2e/insurance.spec.ts` | SQL-мутант: `select` видано `anon` замість `revoke` |

UAT на проді: `@writes` для AC, що змінюють статус; синтетичні картки `uat-<запуск>-…@example.test` створює й прибирає
секретний ключ (`tests/e2e/support/admin.ts`), свій клієнт для therapist1 — утримання синтетичної картки на майбутньому
слоті therapist1, видаляється разом із карткою.

## Risks / Trade-offs

- [Окрема таблиця] → ще один запит у картці: вбудовуємо `client_insurance(status)` у той самий select `clients`
  (PostgREST, зв'язок 1:1 за FK).
- [UAT пише в спільний прод] → лише синтетичні картки з прибиранням після себе; прод-картки PM не змінюємо.
