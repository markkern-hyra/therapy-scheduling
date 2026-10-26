# Design: impl-client-cards

## Context

- Специфікація: `openspec/specs/clients/spec.md` (AC-CARD-01…06, 08…10) і `openspec/specs/access/spec.md` (AC-CARD-07,
  11) — переклад Sofiia-pm/therapy-scheduling-spec#19, зміна `add-client-cards`.
- Права — матриця `requirements/product.md`: картки створюють admin і scheduler; терапевт бачить лише своїх клієнтів
  («Held» або «Confirmed» у нього) з усіма даними анкети, зокрема email і даними опікуна; без входу — сторінка входу; без
  ролі — лише повідомлення. Ролі в зрізі — лише сид (керування ролями в застосунку немає).
- Що вже є: ролі `admin` / `scheduler` / `therapist` у `profiles.role` (`private.has_role`), таблиця `clients` (ім'я,
  email, RLS select/insert для admin і scheduler), `requireRole` (`getClaims()` → `profiles.role`), `runAction`,
  `messages.ts`, слоти й утримання зрізу 1 (`impl-slot-hold`, задачі 2.1, 3.1), тести бази на PGlite (`tests/db`),
  дизайн-система (`DESIGN.md`, `src/components/ui`).
- Відкриті питання до PM (до відповіді — текст PM, тимчасові рішення позначено «тимчасово»): Q5 #27 (порожній список
  планувальника), Q6 #28 (неіснуюча картка), Q7 #29 (вихід без ролі), колег #20–#25.

## Goals / Non-Goals

**Goals:** кожен AC-CARD-01…11 — код, тест з AC ID у назві, рядок «реалізовано» в `docs/conformance.md`; на кожен
відмовний AC (05, 06, 07, 08, 11) — тест бази на PGlite, що перевіряє і відмову, і незмінні дані; мутаційна перевірка
для щонайменше двох відмовних AC у CI.

**Non-Goals:** редагування й архівування картки (після WS11), пара чи сім'я (WS9), керування ролями й користувачами в
застосунку, запрошення (Admin API не потрібен — `SUPABASE_SECRET_KEY` у Vercel не додаємо).

## Decisions

## UI і компоненти

| Сторінка | Хто | Що бачить | AC |
|---|---|---|---|
| `/clients` | admin, scheduler | усі картки (`Table`): ім'я, тип, дата народження, мова, контакт (email дорослого або ім'я й email опікуна), посилання на картку; кнопка «New client»; без карток — «No clients yet.» (тимчасово, до відповіді на Q5 #27) | 10 |
| `/clients` | therapist | лише своїх клієнтів (ті самі колонки, рядки відсіює RLS); без них — «No clients yet. Clients appear here when a scheduler holds a slot with you.» | 04, 08, 09 |
| `/clients/new` | admin, scheduler | форма картки: тип («Adult» / «Child»), ім'я, дата народження (`Input type="date"`, `max` — сьогодні за LA), мова (`Select`: English / Spanish), email (для дорослого), ім'я й email опікуна (для дитини); помилка — `Alert` над формою, **введене лишається у формі** | 01, 02, 03 |
| `/clients/new` | therapist | лише `Alert` «Only schedulers and admins can create client cards.», форми немає (варіант A питання #24; дія відмовляє й без сторінки) | 06 |
| `/clients/[id]` | admin, scheduler; therapist — свій клієнт | усі дані анкети; у картці дитини — дані опікуна; поля карток зрізу 1 без значення — «Not provided» | 01, 02, 04, 10 |
| `/clients/[id]` | therapist — чужий клієнт; будь-хто — картки немає | лише `Alert` «You don't have access to this client.», жодних даних (для неіснуючої картки — тимчасово, до відповіді на Q6 #28) | 05, 08 |
| `/no-access` | увійшов без ролі (будь-яка сторінка веде сюди) | лише «Your account has no access yet. Contact an administrator.» і кнопка «Sign out» (без навігації й даних; кнопка — рекомендація Q7 #29) | 11 |
| вибір клієнта під час утримання (`/slots`, задача 3.1) | admin, scheduler | ім'я й контакт: email дорослого або email опікуна дитини | 01, 02 |

- Компоненти — лише `@/components/ui` (`Button`, `Input`, `Label`, `Select`, `Table`, `Alert`, `Badge`); форма картки
  — клієнтський компонент `src/app/_components/client-card-form.tsx` з `useActionState` (React 19): дія повертає
  `{ error, values }`, і поля беруть `defaultValue` з `values` — так після помилки введене лишається (AC-CARD-03), а
  особисті дані не потрапляють в адресу (`?error=` лише код).
- Тексти — дослівно з AC; нові коди в `messages.ts`: `GUARDIAN_INVALID`, `CARD_FORBIDDEN`, `CLIENT_NO_ACCESS`,
  `NO_ROLE`, `NO_OWN_CLIENTS`; тимчасовий `INTAKE_INVALID` «Enter a date of birth that is not in the future and choose
  a session language.» — до відповіді PM на #21.

## Дані й RLS

**Міграція 1 — набір ролей, порядок drop-first** (AC-CARD-11): зняти `profiles_role_check` → дані без змін (усі наявні
ролі лишаються; «без ролі» — лише нові користувачі) → `role` дозволяє `null`, новий `default null` (тригер
`on_auth_user_created` створює профіль без ролі) → новий `profiles_role_check`: `role is null or role in ('admin',
'scheduler', 'therapist')`. `private.has_role` для `null` уже дає `false`, тож користувач без ролі не проходить жодної
політики. `supabase/demo-users.json` — у тому самому PR: `newuser1@example.test` без ролі; `create-demo-users.mjs`
приймає `role: null`.

**Міграція 1 — картка з анкети** (AC-CARD-01, 02, 03):

| Колонка `clients` | Правило (check) |
|---|---|
| `kind` | `not null default 'adult'`, `in ('adult', 'child')` — картки зрізу 1 стають «Adult» |
| `email` | `drop not null`; наявні `clients_email_check` і `clients_email_key` (нормалізований, коректний, унікальний) |
| `birth_date`, `language` | `clients_intake_check` — `birth_date is not null and language is not null and birth_date <= (now() at time zone 'America/Los_Angeles')::date and language in ('English', 'Spanish')`, **`not valid`** (CHECK пропускає NULL, тож обов'язковість — явним `is not null` і в `clients_guardian_check` теж): діє на нові рядки, картки зрізу 1 лишаються дійсними («Not provided») |
| `guardian_name`, `guardian_email` | `clients_guardian_check` — для `child`: непорожнє ім'я, email нормалізований і коректний (те саме правило, що ADR 0003); для `adult` — обидва `null` |
| — | `clients_contact_check` — `adult` має власний email, `child` — ні |

- **GRANT:** `insert (full_name, email, kind, birth_date, language, guardian_name, guardian_email)` для
  `authenticated`; `update` і `delete` не видаємо (картку не редагують). Політика insert — як і раніше, лише
  `private.has_role('admin', 'scheduler')`.
- **Переклад помилок за назвою обмеження** (`errorCode`, порада з рев'ю WS6): `clients_email_key` → `CLIENT_EXISTS`,
  `clients_full_name_check` / `clients_email_check` / `clients_contact_check` → `CLIENT_INVALID`,
  `clients_guardian_check` → `GUARDIAN_INVALID`, `clients_intake_check` → `INTAKE_INVALID`, `42501` на `clients` →
  `CARD_FORBIDDEN`; невідоме — `UNKNOWN`.

**Міграція 2 — свої клієнти терапевта** (AC-CARD-04, 05, 08, 09): `private.is_own_client(p_client uuid)` (`security
definer`, `set search_path = ''`, `stable`) — чи є в цього клієнта утримання на слоті поточного терапевта
(`slots.therapist_id = (select auth.uid())`), активне за `private.is_active_hold(…, now())` («Held» або «Confirmed»).
Політика `clients_select_own_for_therapist` (`for select to authenticated using (private.has_role('therapist') and
private.is_own_client(id))`). Хелпер — `security definer`, бо політика `holds` для терапевта сама читає `clients` (без
нього — рекурсія політик, 42P17). Права — як у `private.has_role`: `revoke execute … from public, anon`, `grant execute
… to authenticated` (`usage` на схему `private` для `authenticated` уже видано в `20261012000000_profiles_and_roles.sql`).
Прострочене утримання не активне — картка зникає сама, без задачі за розкладом (AC-CARD-08).

| Таблиця | select | insert | update | delete |
|---|---|---|---|---|
| `clients` | admin, scheduler — усі (AC-CARD-10); therapist — лише `is_own_client` (AC-CARD-04, 05, 08) | admin, scheduler; колонки анкети (AC-CARD-01, 02, 06) | — | — |
| `profiles` | без змін; користувач без ролі бачить лише власний профіль | — | лише `full_name` (роль собі не змінити — пастку закрито й покрито тестом) | — |

## Auth

- **Proxy — лише UX:** `src/proxy.ts` перенаправляє без сесії на `/login` (AC-CARD-07), але дані захищає не він.
- **Кожна захищена сторінка й Server Action** починається з `requireRole` (сторінка `/login` і дії, що сесію
  створюють чи завершують, — `login`, `signOut` — його не викликають) (`getClaims()`, не `getSession()`; роль — з
  `profiles.role`, ніколи з `user_metadata`): без claims → `/login` (AC-CARD-07); роль `null` → `/no-access`
  (AC-CARD-11). Сама сторінка `/no-access` `requireRole` не викликає (інакше — цикл перенаправлень): вона перевіряє
  лише вхід (`getClaims()`), а користувача з роллю відправляє на `/`.
- **`createClientCard`** (привілейована дія — запис чужих даних): `requireRole()` → `canCreateCards(role)` **до**
  запису; не admin / scheduler → `CARD_FORBIDDEN` без запису (AC-CARD-06). Запис — клієнтом користувача, тож RLS і
  GRANT відмовляють і на прямий запит до Data API в обхід дії (той самий `CARD_FORBIDDEN`).
- **Admin-клієнт не потрібен:** ролі — сид (`npm run users:demo`), запрошень немає; `SUPABASE_SECRET_KEY` лише в
  `.env.local` для скриптів. Правило «секретний ключ лише на сервері» — job «Секретний ключ лише на сервері»
  (`architecture.yml`).

### Тести

- **База (PGlite, `tests/db/client-cards.test.ts`):** AC-CARD-03 (дитина без опікуна — `23514`, карток не додалось),
  AC-CARD-05 і 08 (therapist1 — 0 рядків чужого чи простроченого клієнта; картка не змінилась), AC-CARD-04 (лише
  client6, client7), AC-CARD-06 (insert від therapist — `42501`, кількість карток та сама), AC-CARD-07 (`anon` — `permission
  denied` на select і insert), AC-CARD-10 (scheduler2, admin — усі три з опікуном), AC-CARD-11 (без ролі — 0 рядків,
  insert відмовлено, кількість та сама), пастка ролі (update власного `role` — `permission denied`, роль та сама).
- **Логіка (Vitest):** `cardFromForm`, `canCreateCards` (AC-CARD-06 на рівні дії), `errorCode` за назвою обмеження,
  вибір тексту порожнього стану за роллю (AC-CARD-09).
- **Мутаційна перевірка:** таблиця «AC → що тимчасово прибрали → який тест упав» в описі кожного PR; у CI — червоні
  прогони щонайменше для AC-CARD-06 (`with check (true)` у `clients_insert_staff`) і AC-CARD-05 (`using (true)` у
  `clients_select_own_for_therapist`), потім revert.

## Risks / Trade-offs

- [Відкриті питання PM] Тексти для дати народження й мови (#21), неіснуюча картка (#28), вихід без ролі (#29), порожній
  список планувальника (#27) — тимчасові рішення позначено; після відповіді — нова зміна специфікації й правка текстів.
- [CHECK з поточною датою] `birth_date <= today` у check: дата в минулому з часом лишається в минулому, тож відновлення
  дампу не впаде.
- [Залежність від утримань] AC-CARD-04, 05, 08, 09 потребують `holds` (задача 3.1 `impl-slot-hold`).

## Migration Plan

Дві міграції, по одній на задачу: `client_cards` (ролі без ролі + колонки анкети) і `own_clients` (хелпер і політика
терапевта). Після merge кожної — `db-deploy`; після першої — `npm run users:demo` (newuser1 без ролі).
