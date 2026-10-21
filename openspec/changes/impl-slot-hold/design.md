# Design: impl-slot-hold

## Context

- Специфікація: `openspec/specs/{slot-holds,therapist-schedule,clients}/spec.md`, AC-HOLD-01 … AC-HOLD-36 (переклад
  Sofiia-pm/therapy-scheduling-spec#2; рішення PM з #3–#12 уже в тексті AC і в Assumptions архівованої зміни
  `add-slot-hold`).
- Шаблон дає: `profiles` з ролями `member` / `admin`, хелпер `private.current_app_role()`, тригер
  `on_auth_user_created`, вхід email + пароль, `getClaims()` на сервері, `scripts/create-demo-users.mjs`.
- Обмеження стеку (AGENTS.md): Next.js 16 App Router без Cache Components; Supabase без Docker локально; міграції
  застосовує лише CI; кожна таблиця — RLS + `revoke` + явні `grant` + політика на кожну операцію; кілька кроків з
  перевіркою — однією транзакцією в Postgres; Vitest без бази; нових залежностей без згоди не додаємо.
- Платформа (requirements/product.md, «Що поза scope»): жодних фонових задач частіше ніж раз на добу — прострочення
  рахуємо за часом створення утримання, а не задачею за розкладом.

## Goals / Non-Goals

**Goals:**

- Кожен AC-HOLD-01 … 36: код + тест `it("AC-HOLD-NN: …")` + рядок «реалізовано» в `docs/conformance.md`.
- Правила утримання й підтвердження тримає **база**, а не лише сторінка: прямий запит до Data API в обхід сторінок
  дає ті самі відмови (AC-HOLD-03, 04, 07, 08, 13, 14, 17, 22, 25, 36).
- Права з матриці `requirements/product.md` — у RLS (терапевт бачить лише своє, AC-HOLD-09, 21).
- Увесь показ часу — America/Los_Angeles, формат `РРРР-ММ-ДД ГГ:ХХ`, 24 години = 1440 хвилин незалежно від переходу
  на літній/зимовий час.

**Non-Goals:**

- Екрани адміністратора для користувачів і доступності терапевтів (слоти — демо-даними).
- Тип сеансу, документи згоди, повторювані сеанси, сповіщення (Non-goals специфікації).
- Показ, хто створив і хто підтвердив утримання (поза межами PM) — у базі ці поля не заводимо.
- Автотести бази в CI (див. «Узгоджено з розробником»).

## Decisions

### 1. Ролі (усі AC; AC-HOLD-08, 14, 19)

Міграція в порядку з AGENTS.md: зняти `profiles_role_check` → `update profiles set role = 'therapist' where role =
'member'` → `alter column role set default 'therapist'` (найменші права) → новий `profiles_role_check` з `admin`,
`scheduler`, `therapist`. Роль читаємо лише з `profiles.role` через `private.current_app_role()`.
Інтерфейс — англійською (Assumptions PM), тож тексти шаблону на `/` і `/login` теж переводимо.

*Альтернатива:* роль у `user_metadata` / JWT — відкинуто (AGENTS.md: роль лише з `profiles`).

### 2. Модель даних

| Таблиця | Ключові колонки | AC |
|---|---|---|
| `profiles` (шаблон) | `role` ∈ admin / scheduler / therapist; терапевт — профіль із роллю `therapist` | усі |
| `clients` | `full_name` (check: не порожнє після `btrim`), `email` (unique; check: `email = lower(btrim(email))` і формат), `created_at` | 10, 11, 15, 16, 34, 35 |
| `slots` | `therapist_id` → profiles, `starts_at` timestamptz, `ends_at` (check `ends_at = starts_at + 60 хв`); unique (`therapist_id`, `starts_at`) | 01, 18, 24, 30–33 |
| `holds` | `slot_id` → slots, `client_id` → clients, `created_at`, `expires_at`, `confirmed_at` (null — не підтверджено) | 02–08, 12–14, 17, 19–29, 36 |

- **Сеанс = підтверджене утримання** (глосарій: «Підтвердження — момент, коли утримання стає сеансом»): окремої таблиці
  сеансів немає, `confirmed_at is not null`.
- **Статус не зберігаємо, а обчислюємо з часу:** `Confirmed`, якщо `confirmed_at`; інакше `Held`, якщо
  `now() < expires_at`; інакше `Expired`. Статус слоту: `Confirmed` / `Held` за його утриманнями, інакше `Past`, якщо
  `starts_at <= now()`, інакше вільний (AC-HOLD-01, 05, 06, 32). Так прострочення відбувається «саме», без задачі за
  розкладом.
- `created_at` і `expires_at = created_at + interval '24 hours'` ставить тригер (клієнт їх не передає й не має на них
  GRANT). `timestamptz + interval '24 hours'` додає рівно 1440 хвилин і на переході на літній/зимовий час (AC-HOLD-02,
  05, 06). Згенерованою колонкою не робимо: `timestamptz + interval` у Postgres не `immutable`.
- Старі прострочені утримання слоту лишаються в таблиці: слот може мати багато утримань у часі, але не більше одного
  активного (`Held`) або підтвердженого (рішення 4).

### 3. Права: GRANT + RLS

| Таблиця | select | insert | update | delete |
|---|---|---|---|---|
| `profiles` | власний; admin — усі; scheduler — профілі терапевтів | — (тригер) | `full_name` (як у шаблоні) | — |
| `clients` | admin, scheduler — усі; therapist — клієнти власних непрострочених утримань і сеансів | admin, scheduler (`full_name`, `email`) | — | — |
| `slots` | admin, scheduler — усі; therapist — власні | — (лише `service_role`) | — | — |
| `holds` | admin, scheduler — усі; therapist — на власних слотах і лише `confirmed_at is not null or expires_at > now()` | admin, scheduler (`slot_id`, `client_id`) | admin, scheduler (`confirmed_at`) | — |

- Політики `to authenticated`, `auth.uid()` лише як `(select auth.uid())`. Перехресні умови (клієнт ↔ утримання ↔
  слот) — через хелпери в `private` (`security definer`, `set search_path = ''`), щоб уникнути рекурсії політик (42P17).
- Прострочене утримання терапевту не видно вже на рівні RLS, а не лише сторінки (AC-HOLD-21; рішення PM #5).

### 4. Правила утримання й підтвердження — у базі (AC-HOLD-03, 04, 07, 08, 13, 14, 17, 22, 25, 26, 36)

Утримання — один `insert into holds`, підтвердження — один `update holds set confirmed_at`: кожен запит — одна
транзакція. Перевірки робить тригер `before insert` / `before update` (`private.*`, `security definer`,
`set search_path = ''`), бо `before`-тригер спрацьовує раніше за `with check` RLS і має дати впізнаваний код помилки.

**Утримання** (`private.check_new_hold`), по черзі; помилка — `raise exception '<КОД>'`:

1. роль не `admin` / `scheduler` → `HOLD_FORBIDDEN` (AC-HOLD-08);
2. `select … from clients where id = new.client_id for update`, потім `select … from slots where id = new.slot_id for
   update` — завжди в цьому порядку (без взаємних блокувань);
3. на слоті вже є `Held` або підтверджене утримання → `SLOT_TAKEN` (AC-HOLD-03, 17);
4. `slots.starts_at <= now()` → `SLOT_STARTED` (AC-HOLD-07);
5. у клієнта є `Held` або підтверджене утримання, слот якого перетинається з цим (`s.starts_at < new_end and
   s.ends_at > new_start` — суміжні не перетинаються, глосарій «Перетин») → `CLIENT_BUSY` (AC-HOLD-25); прострочені не
   рахуються (AC-HOLD-26);
6. `created_at = now()`, `expires_at = now() + interval '24 hours'`, `confirmed_at = null`.

Блокування рядка слоту `for update` серіалізує одночасні спроби: друга транзакція чекає першу, а після її коміту
крок 3 бачить нове утримання → `SLOT_TAKEN`, тож створюється рівно одне (AC-HOLD-04). Блокування рядка клієнта так само
серіалізує одночасні утримання одного клієнта в різних терапевтів (AC-HOLD-25).

**Підтвердження** (`private.check_hold_confirm`, `before update of confirmed_at`):

1. роль не `admin` / `scheduler` → `CONFIRM_FORBIDDEN` (AC-HOLD-14);
2. `old.confirmed_at is not null` → `ALREADY_CONFIRMED` (AC-HOLD-36): друге `update` того самого рядка чекає на
   блокування першого й після його коміту бачить уже підтверджене утримання — і для «в ту саму мить»;
3. `old.expires_at <= now()` → `HOLD_EXPIRED` (AC-HOLD-13);
4. `slots.starts_at <= now()` → `CONFIRM_STARTED`, утримання лишається `Held` (AC-HOLD-22, 23);
5. `confirmed_at = now()` (значення від клієнта ігнорується); будь-який планувальник чи адміністратор може
   підтвердити будь-яке утримання (AC-HOLD-19, 27).

*Альтернативи:* (а) перевірки лише в server action — відкинуто: прямий запит до Data API їх оминає, а одночасність
(AC-HOLD-04, 36) без блокування в базі не гарантувати; (б) RPC-функції `hold_slot` / `confirm_hold` — рівноцінно, але
тригер ловить і прямий `insert`/`update`, тож окрема RPC не потрібна; (в) exclusion- чи частковий unique-індекс —
неможливий, бо «активне» залежить від `now()`.

### 5. Час і часовий пояс (AC-HOLD-02, 05, 06, 22, 23, 28–31)

- У базі — `timestamptz`; порівняння з `now()`.
- У застосунку — `src/lib/scheduling/time.ts` на `Intl.DateTimeFormat` з `timeZone: 'America/Los_Angeles'`, без нових
  залежностей: `formatPracticeDateTime` (`2026-11-03 14:30`), `practiceDayRange(day)` і `practiceWeek(today)` (межі дня й
  тижня пн–нд у UTC з урахуванням переходу на літній/зимовий час), `holdExpiresAt`.
- Усі доменні функції приймають `now` параметром — тести задають час AC (наприклад, `2026-11-03T12:30` за LA).

### 6. Доменний модуль `src/lib/scheduling/` (чистий TypeScript, без Supabase)

| Файл | Що робить | AC |
|---|---|---|
| `time.ts` | часовий пояс практики, формат, межі дня й тижня, `holdExpiresAt` | 02, 05, 06, 30, 31 |
| `status.ts` | `holdStatus`, `slotStatus`, `isHoldable`, `daySlotsView` (повідомлення «No free slots on this day.») | 01, 05, 06, 18, 24, 32, 33 |
| `holds.ts` | `checkHold`, `checkConfirm` — ті самі правила й порядок, що в тригерах | 03, 04, 07, 08, 12–14, 17, 19, 22, 23, 25–27, 36 |
| `visibility.ts` | `schedulerHolds` (прострочене — до початку слоту), `therapistWeek` (без прострочених, лише власне) | 09, 20, 21, 28–31 |
| `clients.ts` | `normalizeEmail`, `checkClient` | 10, 11, 15, 16, 34, 35 |
| `roles.ts` | `canHold`, `canConfirm`, `canManageClients` | 08, 14, 19 |
| `messages.ts` | код → текст PM дослівно; розпізнавання кодів з помилок Postgres (`23505` → `CLIENT_EXISTS`, `42501` → `*_FORBIDDEN`) | усі повідомлення |

Коди й тексти: `SLOT_TAKEN` «This slot is no longer available.»; `SLOT_STARTED` «This slot has already started and cannot
be held.»; `HOLD_FORBIDDEN` «Only schedulers and admins can hold slots.»; `CLIENT_BUSY` «This client already has a hold or
session at this time.»; `HOLD_EXPIRED` «This hold has expired. Hold the slot again.»; `CONFIRM_STARTED` «This slot has
already started and cannot be confirmed.»; `ALREADY_CONFIRMED` «This hold is already confirmed.»; `CONFIRM_FORBIDDEN`
«Only schedulers and admins can confirm holds.»; `CLIENT_INVALID` «Enter the client's name and a valid email.»;
`CLIENT_EXISTS` «A client with this email already exists.»; `NO_FREE_SLOTS` «No free slots on this day.».

### 7. Server actions і сторінки

| Сторінка | Хто | Що | Server action | AC |
|---|---|---|---|---|
| `/` | усі | роль і посилання; scheduler/admin → `/slots`, therapist → `/schedule` | `signOut` | — |
| `/clients` | admin, scheduler | список клієнтів і форма «ім'я + email» | `createClientCard` → `checkClient` → `insert clients` | 10, 11, 15, 16, 34, 35 |
| `/slots?therapist=…&day=…` | admin, scheduler | слоти терапевта на день зі статусами, клієнт і «Held until», кнопка «Hold» з вибором клієнта лише для вільних | `holdSlot` → `checkHold` → `insert holds` | 01–04, 06, 07, 17, 18, 24–26, 32, 33 |
| `/holds` | admin, scheduler | утримання й сеанси: клієнт, терапевт, слот, статус, «Held until»; кнопка «Confirm» для `Held` | `confirmHold` → `checkConfirm` → `update holds` | 05, 06, 12, 13, 19, 20, 22, 23, 27–29, 36 |
| `/schedule?week=…` | therapist | власний тиждень пн–нд зі статусами слотів, перемикання тижнів | — | 09, 21, 30, 31 |

- Роль — `getClaims()` + `profiles.role` (не `getSession()`); сторінки іншої ролі перенаправляють на `/`.
- Server action спершу перевіряє роль і правила доменом (швидка відповідь), потім пише в базу; помилку бази
  перекладає `messages.ts` на той самий код. Код повертаємо в `?error=<КОД>`, сторінка показує текст PM.
- Терапевт кнопок «Hold» / «Confirm» не бачить; прямий виклик action чи Data API дає `HOLD_FORBIDDEN` /
  `CONFIRM_FORBIDDEN` (AC-HOLD-08, 14).

### 8. «Valid email» (AC-HOLD-11, 15)

PM правила не визначила (припущення розробника в `add-slot-hold`). Рішення: після `normalizeEmail` (`btrim` + нижній
регістр) email має відповідати `^[^\s@]+@[^\s@]+\.[^\s@]+$` — одне `@`, щось до нього, крапка в домені, без пробілів.
Те саме правило — у `checkClient` і в check-обмеженні `clients.email`. Запис рішення — ADR 0003.

### 9. Тести

- Юніт-тести `tests/scheduling/*.test.ts`, назви починаються з AC ID (`it("AC-HOLD-32: …")`); дані й час — з AC.
- Для правил, які тримає база (AC-HOLD-04, 08, 14, 17, 25, 36), тест перевіряє доменну функцію з тим самим порядком
  перевірок і розпізнавання коду помилки бази → текст PM. Саму одночасність і RLS перевіряємо вручну (два сеанси в
  браузері, три ролі) за чеклістом у PR задачі.

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

- [Тести бази не в CI] RLS, тригери й одночасність перевіряються вручну → чекліст ручної перевірки в кожному PR з
  міграцією (pgTAP свідомо не додаємо — див. «Узгоджено з розробником»).
- [Два місця правил] Правила утримання є і в тригері, і в `holds.ts` → однаковий порядок перевірок і ті самі коди;
  тест на кожен код.
- [Час сервера vs бази] Статус на сторінці рахує `new Date()` сервера Next.js, а тригер — `now()` бази → розбіжність
  у секунди на межі хвилини; база — остаточна інстанція (тригер відмовить, сторінка покаже текст PM).
- [Старі демо-користувачі] `member1@` і `member2@` після міграції стануть терапевтами й отримають демо-слоти →
  прибрати їх вручну в Dashboard (Authentication → Users) або лишити як додаткових терапевтів.
- [Типи] `database.types.ts` для нових таблиць — з Summary прогону `db-check` у PR кожної міграції.

## Migration Plan

- Міграції — по одній на задачу (`npx supabase migration new <назва>`), у порядку задач `tasks.md`: ролі → клієнти →
  слоти й `generate_demo_slots` → утримання з тригерами й RLS. Кожна — `db-check` у PR, `db-deploy` після merge.
- Після міграції ролей і слотів: `npm run users:demo` (користувачі, ролі, слоти); клієнти демо — Actions → CI → Run
  workflow з `include_seed` або через сторінку `/clients`.
- Відкат — лише новою міграцією (без `down`), як вимагає AGENTS.md.

## Узгоджено з розробником

- ADR у `docs/decisions/` (статус «прийнято»), кожен — у PR задачі, де рішення з'являється в коді:
  0001 — сеанс як підтверджене утримання й статус, обчислений з часу (рішення 2; задача 4.1);
  0002 — правила утримання й підтвердження в тригерах з блокуванням рядків (рішення 4; задача 4.1);
  0003 — правило «valid email» (рішення 8; задача 2.1).
- Автотестів бази (pgTAP, окремий workflow) не додаємо: RLS, тригери й одночасність — ручна перевірка за чеклістом у PR
  задачі (як у курсовому демо).
