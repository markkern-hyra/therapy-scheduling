# Design: impl-slot-hold

## Context

- Специфікація: `openspec/specs/{slot-holds,therapist-schedule,clients}/spec.md`, AC-HOLD-01 … AC-HOLD-42 (переклад
  Sofiia-pm/therapy-scheduling-spec#2; рішення PM з #3–#18 уже в тексті AC і в Assumptions архівованих змін
  `add-slot-hold` і `clarify-slot-hold-2`).
- Шаблон дає: `profiles` з ролями `member` / `admin`, хелпер `private.current_app_role()`, тригер
  `on_auth_user_created`, вхід email + пароль, `getClaims()` на сервері, `scripts/create-demo-users.mjs`.
- Обмеження стеку (AGENTS.md): Next.js 16 App Router без Cache Components; Supabase без Docker локально; міграції
  застосовує лише CI; кожна таблиця — RLS + `revoke` + явні `grant` + політика на кожну операцію; кілька кроків з
  перевіркою — однією транзакцією в Postgres; тести бази — PGlite у процесі Vitest (рішення 9); нових залежностей без
  згоди не додаємо.
- Платформа (requirements/product.md, «Що поза scope»): жодних фонових задач частіше ніж раз на добу — прострочення
  рахуємо за часом створення утримання, а не задачею за розкладом.

## Принципи

- **DRY — одне джерело правди на правило.** Правила запису (утримання, підтвердження, ролі, унікальність email) — лише
  в базі; TypeScript їх не повторює, а показує статуси й перекладає коди помилок бази в тексти PM. Формули, потрібні в
  кількох місцях, — один хелпер: `private.has_role`, `private.is_active_hold`, `requireRole`, `runAction`, `messages.ts`.
- **KISS.** Без окремої таблиці сеансів, без RPC там, де вистачає одного `insert`/`update` з тригером, без бібліотек UI
  й дат, без шарів-репозиторіїв і класів.
- **SOLID у функціональному коді.** Маленькі модулі з однією відповідальністю (`time`, `status`, `visibility`,
  `clients`, `messages`); чисті функції отримують дані й `now` параметрами (тести задають час AC); сторінки й server
  actions тонкі — лише зчитати, викликати доменну функцію чи базу, показати результат.

## Goals / Non-Goals

**Goals:**

- Кожен AC-HOLD-01 … 42: код + тест `it("AC-HOLD-NN: …")` + рядок «реалізовано» в `docs/conformance.md`.
- Правила утримання й підтвердження тримає **база**: прямий запит до Data API в обхід сторінок дає ті самі відмови
  (AC-HOLD-03, 04, 07, 08, 13, 14, 17, 22, 25, 36).
- Права з матриці `requirements/product.md` — у RLS (терапевт бачить лише своє, AC-HOLD-09, 21).
- Увесь показ часу — America/Los_Angeles, формат `РРРР-ММ-ДД ГГ:ХХ`, 24 години = 1440 хвилин незалежно від переходу
  на літній/зимовий час.

**Non-Goals:**

- Екрани адміністратора для користувачів і доступності терапевтів (слоти — демо-даними).
- Тип сеансу, документи згоди, повторювані сеанси, сповіщення (Non-goals специфікації).
- Показ, хто створив і хто підтвердив утримання (поза межами PM) — у базі ці поля не заводимо.

## Decisions

### 1. Ролі (усі AC; AC-HOLD-08, 14, 19)

Міграція в порядку з AGENTS.md: зняти `profiles_role_check` → `update profiles set role = 'therapist' where role =
'member'` → `alter column role set default 'therapist'` (найменші права) → новий `profiles_role_check` з `admin`,
`scheduler`, `therapist`. Роль читаємо лише з `profiles.role`.

- SQL: `private.has_role(variadic roles text[])` (`security definer`, `set search_path = ''`) поверх наявного
  `private.current_app_role()` — один вираз для всіх політик і тригерів замість повторюваного `in (…)`.
- TypeScript: `src/lib/auth/roles.ts` — тип `Role` і `STAFF_ROLES = ['admin', 'scheduler']` (хто утримує, підтверджує й
  створює клієнтів); `src/lib/auth/require-role.ts` — `requireRole(...roles)`: `getClaims()` (не `getSession()`) →
  `profiles.role` → інакше перенаправлення на `/`; без аргументів — будь-який користувач, що увійшов. Одна перевірка
  для всіх сторінок і server actions.
- Інтерфейс — англійською (Assumptions PM), тож тексти шаблону на `/` і `/login` теж переводимо.

*Альтернатива:* роль у `user_metadata` / JWT — відкинуто (AGENTS.md: роль лише з `profiles`).

### 2. Модель даних

| Таблиця | Ключові колонки | AC |
|---|---|---|
| `profiles` (шаблон) | `role` ∈ admin / scheduler / therapist; терапевт — профіль із роллю `therapist` | усі |
| `clients` | `full_name` (`not null`; check: не порожнє після `btrim`), `email` (`not null`; unique; check: `email = lower(btrim(email))` і формат), `created_at` | 10, 11, 15, 16, 34, 35, 39, 41 |
| `slots` | `therapist_id` → profiles, `starts_at` timestamptz, `ends_at` (check `ends_at = starts_at + 60 хв`); unique (`therapist_id`, `starts_at`) | 01, 18, 24, 30–33 |
| `holds` | `slot_id` → slots, `client_id` → clients, `created_at`, `expires_at`, `confirmed_at` (null — не підтверджено) | 02–08, 12–14, 17, 19–29, 36–38, 42 |

- **Сеанс = підтверджене утримання** (глосарій: «Підтвердження — момент, коли утримання стає сеансом»): окремої таблиці
  сеансів немає, `confirmed_at is not null`.
- **Статус не зберігаємо, а обчислюємо з часу:** `Confirmed`, якщо `confirmed_at`; інакше `Held`, якщо
  `now() < expires_at`; інакше `Expired`. Статус слоту: `Confirmed` / `Held` за його утриманнями, інакше `Past`, якщо
  `starts_at <= now()`, інакше вільний (AC-HOLD-01, 05, 06, 32). Прострочення відбувається «саме», без задачі за
  розкладом.
- «Активне утримання» (`Held` або `Confirmed`) — один хелпер `private.is_active_hold(confirmed_at, expires_at, at)`
  для тригерів (`at` — їхній `v_now`, рішення 4) і RLS (`at` — `now()`); у TypeScript той самий зміст має `holdStatus` у
  `status.ts` (показ, не запис).
- `created_at` і `expires_at = created_at + interval '24 hours'` ставить тригер зі свого `v_now` (клієнт їх не передає
  й не має на них GRANT). `timestamptz + interval '24 hours'` додає рівно 1440 хвилин і на переході на літній/зимовий час (AC-HOLD-02,
  05, 06). Згенерованою колонкою не робимо: `timestamptz + interval` у Postgres не `immutable`.
- Старі прострочені утримання слоту лишаються в таблиці: слот може мати багато утримань у часі, але не більше одного
  активного (рішення 4).

### 3. Права: GRANT + RLS

| Таблиця | select | insert | update | delete |
|---|---|---|---|---|
| `profiles` | власний; admin — усі; scheduler — профілі терапевтів | — (тригер) | `full_name` (як у шаблоні) | — |
| `clients` | admin, scheduler — усі; therapist — клієнти власних активних утримань і сеансів | admin, scheduler (`full_name`, `email`) | — | — |
| `slots` | admin, scheduler — усі; therapist — власні | — (лише `service_role`) | — | — |
| `holds` | admin, scheduler — усі; therapist — на власних слотах і лише активні | admin, scheduler (`slot_id`, `client_id`) | `confirmed_at` — ті самі рядки, що в select (дозвіл перевіряє тригер → `CONFIRM_FORBIDDEN`) | — |

- Політики `to authenticated`, `auth.uid()` лише як `(select auth.uid())`, роль — `private.has_role(…)`. Перехресні
  умови (клієнт ↔ утримання ↔ слот) — через хелпери в `private` (`security definer`, `set search_path = ''`), щоб
  уникнути рекурсії політик (42P17).
- Прострочене утримання терапевту не видно вже на рівні RLS, а не лише сторінки (AC-HOLD-21; рішення PM #5).
- Чому update `holds` відкритий для видимих рядків: політика, що відсіює рядок, не викликає тригер — терапевт отримав би
  «0 рядків» без `CONFIRM_FORBIDDEN` (AC-HOLD-14). Так рядок доходить до тригера, а той відмовляє з кодом; невидимі
  рядки, як і раніше, — 0 рядків без розкриття даних. Для insert так не треба: `before insert` спрацьовує раніше за
  `with check` і дає `HOLD_FORBIDDEN` (AC-HOLD-08).

### 4. Правила утримання й підтвердження — лише в базі (AC-HOLD-03, 04, 07, 08, 13, 14, 17, 22, 25, 26, 36)

Утримання — один `insert into holds`, підтвердження — один `update holds set confirmed_at`: кожен запит — одна
транзакція. Перевірки робить тригер `before insert` / `before update` (`private.*`, `security definer`,
`set search_path = ''`), бо `before`-тригер спрацьовує раніше за `with check` RLS і має дати впізнаваний код помилки.
Це **єдине** місце цих правил: server action їх не повторює.

**Утримання** (`private.check_new_hold`), по черзі; помилка — `raise exception '<КОД>'`:

1. не `private.has_role('admin', 'scheduler')` → `HOLD_FORBIDDEN` (AC-HOLD-08);
2. `select … from clients where id = new.client_id for update`, потім `select … from slots where id = new.slot_id for
   update` — завжди в цьому порядку (без взаємних блокувань); після блокувань — `v_now := clock_timestamp()`, далі
   лише він (`now()` — час початку транзакції, а запит міг чекати на блокування);
3. на слоті вже є активне утримання на `v_now` → `SLOT_TAKEN` (AC-HOLD-03, 17);
4. `slots.starts_at <= v_now` → `SLOT_STARTED` (AC-HOLD-07);
5. у клієнта є активне утримання, слот якого перетинається з цим (`s.starts_at < new_end and s.ends_at > new_start` —
   суміжні не перетинаються, глосарій «Перетин») → `CLIENT_BUSY` (AC-HOLD-25); прострочені не рахуються (AC-HOLD-26);
6. `created_at = v_now`, `expires_at = v_now + interval '24 hours'`, `confirmed_at = null`.

Блокування рядка слоту `for update` серіалізує одночасні спроби: друга транзакція чекає першу, а після її коміту
крок 3 бачить нове утримання → `SLOT_TAKEN`, тож створюється рівно одне (AC-HOLD-04). Блокування рядка клієнта так само
серіалізує одночасні утримання одного клієнта в різних терапевтів (AC-HOLD-25).

**Підтвердження** (`private.check_hold_confirm`, `before update of confirmed_at`):

1. не `private.has_role('admin', 'scheduler')` → `CONFIRM_FORBIDDEN` (AC-HOLD-14);
2. `old.confirmed_at is not null` → `ALREADY_CONFIRMED` (AC-HOLD-36): друге `update` того самого рядка чекає на
   блокування першого й після його коміту бачить уже підтверджене утримання — і для «в ту саму мить»;
3. `v_now := clock_timestamp()` (рядок уже заблоковано самим `update`); `old.expires_at <= v_now` → `HOLD_EXPIRED`
   (AC-HOLD-13);
4. `slots.starts_at <= v_now` → `CONFIRM_STARTED`, утримання лишається `Held` (AC-HOLD-22, 23);
5. `confirmed_at = v_now` (значення від клієнта ігнорується) — утримання стає сеансом; будь-який планувальник чи
   адміністратор може підтвердити будь-яке утримання (AC-HOLD-19, 27).

*Альтернативи:* (а) перевірки ще й у server action «для швидкої відповіді» — відкинуто: дублювання правил (DRY), а
сторінка й так не показує кнопок «Hold» / «Confirm» там, де статус їх не дозволяє; (б) RPC-функції `hold_slot` /
`confirm_hold` — зайвий шар (KISS): тригер ловить і прямий `insert`/`update`; (в) exclusion- чи частковий unique-індекс
— неможливий, бо «активне» залежить від `now()`.

### 5. Час і часовий пояс (AC-HOLD-02, 05, 06, 22, 23, 28–31)

- У базі — `timestamptz`; читання й RLS порівнюють з `now()`, тригери запису — з `clock_timestamp()` після блокувань
  (рішення 4).
- У застосунку — `src/lib/scheduling/time.ts` на `Intl.DateTimeFormat` з `timeZone: 'America/Los_Angeles'`, без нових
  залежностей: `formatPracticeDateTime` (`2026-11-03 14:30`), `practiceDayRange(day)` і `practiceWeek(today)` (межі дня й
  тижня пн–нд у UTC з урахуванням переходу на літній/зимовий час).
- Усі доменні функції приймають `now` параметром — тести задають час AC (наприклад, `2026-11-03T12:30` за LA).

### 6. Доменний модуль `src/lib/scheduling/` (чистий TypeScript, без Supabase; лише показ)

| Файл | Що робить | AC |
|---|---|---|
| `time.ts` | часовий пояс практики, формат, межі дня й тижня | 02, 05, 06, 30, 31 |
| `status.ts` | `holdStatus`, `slotStatus` (вільний, «Held», «Confirmed», «Expired», «Past»), `isHoldable`, `daySlotsView` («No free slots on this day.») | 01, 02, 05, 06, 12, 18, 24, 26, 32, 33 |
| `visibility.ts` | `schedulerHolds` (лише «Held» і «Expired», слот яких ще не почався, за часом слоту від найближчого; прострочене зникає, коли слот знову утримали за тим самим клієнтом), `therapistWeek` (без прострочених, лише власне; клієнт — лише ім'я) | 09, 20, 21, 28–31, 37, 38, 40, 42 |
| `clients.ts` | `normalizeEmail` (форма перед записом; правило формату — check бази й ADR 0003) | 34, 35 |
| `messages.ts` | одна мапа код → текст PM дослівно; `errorCode(error)` — код із помилки Postgres: `P0001` — код із `raise exception '<КОД>'` тригера правил; `23505` і `23514` — за назвою обмеження, бо той самий код у різних таблиць означає різне (`clients_email_key` → `CLIENT_EXISTS`, `clients_full_name_check` / `clients_email_check` → `CLIENT_INVALID`); решта, зокрема `42501`, — `UNKNOWN` (відмову утримання дає тригер: `HOLD_FORBIDDEN`) | 03, 04, 07, 08, 11, 13–17, 22, 25, 36 |

Коди й тексти: `SLOT_TAKEN` «This slot is no longer available.»; `SLOT_STARTED` «This slot has already started and cannot
be held.»; `HOLD_FORBIDDEN` «Only schedulers and admins can hold slots.»; `CLIENT_BUSY` «This client already has a hold or
session at this time.»; `HOLD_EXPIRED` «This hold has expired. Hold the slot again.»; `CONFIRM_STARTED` «This slot has
already started and cannot be confirmed.»; `ALREADY_CONFIRMED` «This hold is already confirmed.»; `CONFIRM_FORBIDDEN`
«Only schedulers and admins can confirm holds.»; `CLIENT_INVALID` «Enter the client's name and a valid email.»;
`CLIENT_EXISTS` «A client with this email already exists.»; `NO_FREE_SLOTS` «No free slots on this day.».

### 7. Server actions і сторінки

Спільне (одне місце на всі сторінки й actions):

- `requireRole(...roles)` (рішення 1) — на початку кожної сторінки й кожного server action; `holdSlot` і `confirmHold`
  вимагають лише входу (`requireRole()`), бо дозвіл на утримання й підтвердження перевіряє база (рішення 4).
- `runAction(write, { back })` у `src/lib/actions.ts` — виконати запис; помилку Supabase через `errorCode` перекласти
  в код; `redirect` на `back` з `?error=<КОД>` або без нього. Кожен action — 3–5 рядків.
- Маленькі компоненти `src/app/_components/`: `StatusBadge`, `ErrorMessage` (читає `?error=` і `messages.ts`),
  навігація за роллю. Лише Tailwind.

| Сторінка | Хто | Що | Server action | AC |
|---|---|---|---|---|
| `/` | усі | роль і посилання; scheduler/admin → `/slots`, therapist → `/schedule` | `signOut` | — |
| `/clients` | admin, scheduler | список клієнтів і форма «ім'я + email» | `createClientCard` → `insert clients` (email через `normalizeEmail`) | 10, 11, 15, 16, 34, 35, 39, 41 |
| `/slots?therapist=…&day=…` | admin, scheduler | слоти терапевта на день зі статусами, клієнт і «Held until», «Hold» з вибором клієнта лише для `isHoldable` | `holdSlot` → `insert holds` | 01–04, 06, 07, 17, 18, 24–26, 32, 33 |
| `/holds` | admin, scheduler | утримання «Held» і «Expired» (без сеансів) за часом слоту: клієнт, терапевт, слот, статус, «Held until»; «Confirm» для `Held` | `confirmHold` → `update holds` | 05, 06, 12, 13, 19, 20, 22, 23, 27–29, 36–38, 42 |
| `/schedule?week=…` | therapist | власний тиждень пн–нд зі статусами слотів і ім'ям клієнта (без email), перемикання тижнів | — | 09, 21, 30, 31, 40 |

- Терапевт сторінок `/clients`, `/slots`, `/holds` не відкриває (`requireRole`), а прямий виклик `holdSlot` /
  `confirmHold` чи Data API отримує від бази `HOLD_FORBIDDEN` / `CONFIRM_FORBIDDEN`, і `runAction` показує текст PM
  (AC-HOLD-08, 14).

### 8. «Valid email» (AC-HOLD-11, 15, 39)

Правило PM («Припущення» Sofiia-pm/therapy-scheduling-spec#2 після #16; AC-HOLD-39) збігається з рішенням, ухваленим
до нього: після нормалізації (`btrim` + нижній регістр) email має відповідати `^[^\s@]+@[^\s@]+\.[^\s@]+$`. Правило живе в одному місці — check-обмеженні
`clients.email` (порушення → `CLIENT_INVALID`); форма лише нормалізує email перед записом. Запис рішення — ADR 0003.

### 9. Тести

- Юніт-тести `tests/scheduling/*.test.ts`, назви починаються з AC ID (`it("AC-HOLD-32: …")`); дані й час — з AC.
- Що перевіряють: статуси й видимість (`status.ts`, `visibility.ts`), час (`time.ts`), нормалізацію email
  (`clients.ts`) і переклад помилки бази в текст PM (`messages.ts`) для кожного коду правил запису.
- Правила бази (тригери, RLS, column grants) — тести бази на PGlite: `tests/db/supabase-pglite.ts` (взято з демо курсу й
  адаптовано) застосовує `supabase/migrations/*.sql` і `seed.sql` у справжньому Postgres у процесі Vitest; `asUser` /
  `asAnon` / `asService` виконують запит від ролі. Кожен тест перевіряє і відмову, і те, що дані не змінились.
- Одночасність (AC-HOLD-04, 36) PGlite (одне з'єднання) не відтворює — ручна перевірка за чеклістом у PR задачі (два
  вікна браузера).

### 10. Демо-дані

- `supabase/demo-users.json`: `admin@example.test` (admin), `scheduler1@` і `scheduler2@` (scheduler), `therapist1@` і
  `therapist2@` (therapist) — синтетичні імена.
- Слоти: функція `public.generate_demo_slots()` (`security invoker`, `execute` лише для `service_role`) — для кожного
  терапевта пн–пт 09:00–16:00 за LA, слоти по 60 хв, поточний і наступні 3 тижні; `on conflict do nothing`. Межі
  рахує Postgres: `(day + час)::timestamp at time zone 'America/Los_Angeles'`. Викликає її `npm run users:demo` після
  створення користувачів (і `seed.sql` — на чистій базі терапевтів немає, тож нічого не робить).
- Клієнти: `seed.sql` — `client1@example.test` «Client One», `client2@example.test` «Client Two»
  (`on conflict (email) do nothing`).

## Risks / Trade-offs

- [PGlite — не Supabase] Auth, Data API і JWT в емуляції спрощені (`auth.uid()` читає `request.jwt.claim.sub`) →
  налаштування хмарного проєкту тест бази не перевіряє; одночасність — ручна перевірка.
- [Статус у двох мовах] «Активне утримання» є в SQL (`is_active_hold`, для запису й RLS) і в TypeScript (`holdStatus`,
  для показу) → одна формула з однаковими назвами; зміна статусу — в обох у тому самому PR.
- [Час сервера vs бази] Статус на сторінці рахує `new Date()` сервера Next.js, а тригер — `now()` бази → розбіжність
  у секунди на межі хвилини; база — остаточна інстанція (тригер відмовить, сторінка покаже текст PM).
- [Старі демо-користувачі] `member1@` і `member2@` після міграції стануть терапевтами й отримають демо-слоти →
  прибрати їх вручну в Dashboard (Authentication → Users) або лишити як додаткових терапевтів.
- [Типи] `database.types.ts` для нових таблиць — з Summary прогону `db-check` у PR кожної міграції.

## Migration Plan

- Міграції — по одній на задачу (`npx supabase migration new <назва>`), у порядку задач `tasks.md`: ролі й клієнти →
  слоти й `generate_demo_slots` → утримання з тригером утримання й RLS → тригер підтвердження → видимість клієнтів для
  терапевта. Кожна — `db-check` у PR, `db-deploy` після merge.
- Після міграції ролей і слотів: `npm run users:demo` (користувачі, ролі, слоти); клієнти демо — Actions → CI → Run
  workflow з `include_seed` або через сторінку `/clients`.
- Відкат — лише новою міграцією (без `down`), як вимагає AGENTS.md.

## Узгоджено з розробником

- Принципи DRY / KISS / SOLID (розділ «Принципи»): правила запису — лише в базі, TypeScript — показ і переклад кодів.
- ADR у `docs/decisions/` (статус «прийнято»), кожен — у PR задачі, де рішення з'являється в коді:
  0001 — сеанс як підтверджене утримання й статус, обчислений з часу (рішення 2; задача 3.1);
  0002 — правила утримання й підтвердження лише в тригерах бази з блокуванням рядків (рішення 4; задача 3.1);
  0003 — правило «valid email» в check-обмеженні (рішення 8; задача 1.1).
- З WS7 — тести бази на PGlite (dev-залежність `@electric-sql/pglite` у першому PR задачі, що їх потребує; курс вимагає
  тест на кожен відмовний AC). pgTAP і окремого workflow не додаємо; одночасність — ручна перевірка.
