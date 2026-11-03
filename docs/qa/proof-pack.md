# QA proof pack: картка клієнта з обмеженим доступом (зріз 2)

<!--
Шаблон з koldovsky/2026-quitcode-08-quality-hw/materials/templates/proof-pack.template.md.
Покладіть у docs/qa/proof-pack.md вашого репо й заповнюйте по кроках WS8 (A → B → C → D).
Посилання — на файли на коміті (…/blob/<sha>/…#L<N>), на PR (…/pull/N) і на прогони (…/actions/runs/N).
Жодних паролів і пароля від accounts.zip. Акаунти — лише адреси *@example.test.
Цей файл — вхід для конвеєра WS9: на кожен AC видно, чим він доведений.
-->

- Прод-URL: https://therapy-scheduling-theta.vercel.app
- Вимоги: https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling-spec · джерело: issues · знімок 2026-11-02
- `/api/health` на момент UAT: <!-- sha і db, напр. «sha 1a2b3c4, db ok, 01.11.2026» -->

## 3 AC

| AC | Вид | «Тоді» (дослівно з вимоги PM) |
|---|---|---|
| AC-CARD-06 | відмова в браузері (заборонена роль) | форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.», і кількість карток клієнтів не змінилася. |
| AC-CARD-12 | стан інтерфейсу (помилка) | картку не створено, scheduler1 одразу бачить три повідомлення біля відповідних полів — «Enter the client's name.», «Enter a date of birth that is not in the future.» і «Select a session language.», а всі введені дані лишаються у формі. |
| AC-CARD-16 | відмова в браузері й стан інтерфейсу | scheduler1 бачить повідомлення «This client card doesn't exist.», therapist1 — «You don't have access to this client.», і жоден із них не бачить жодних даних клієнтів. |

## A. Ворота

- PR воріт: https://github.com/markkern-hyra/therapy-scheduling/pull/30
- Зелений `quality` на `main`: https://github.com/markkern-hyra/therapy-scheduling/actions/runs/41618737448
- Обов'язкові перевірки в `solo-main`: ще не додано (2026-11-03: лише `spec`, `app`, `conformance`, `db-check`); `quality` зелений на `main`, додати — «Ворота: fallow audit», «Покриття: доменна підлога»

Розбір першого повного прогону `fallow` (той самий — в описі PR воріт):

| Група знахідок | Скільки | Справжня / навмисна / хибна | Дія і причина |
|---|---|---|---|
| unused file `src/lib/supabase/client.ts` | 1 | справжня | видалено: клієнтського Supabase у застосунку немає, сервер і proxy мають свої клієнти |
| unused export `AC_ID_GLOBAL` (`scripts/lib/spec-lib.mjs`) | 1 | справжня | видалено: жодного споживача |
| дублі `walk` і обхід файлів (`check-design-tokens.mjs`, `check-server-boundary.mjs`) | 2 групи | навмисна | лишено: окремі скрипти шаблону без спільних залежностей, 28 рядків; спільний модуль заради двох перевірок складніший за копію |
| висока складність у скриптах шаблону (`check-spec.mjs`, `check-design-tokens.mjs`, `check-server-boundary.mjs`, `create-demo-users.mjs`) | 8 | навмисна | лишено: скрипти шаблону перевірено тестами `tests/scripts`; `audit.gate: new-only` їх не валить |
| висока складність сторінок (`SlotsPage` і її рядок списку, `ClientPage`, `ClientsPage`) | 4 | навмисна | лишено: розгалуження JSX за статусом і роллю; логіка винесена в чисті `status.ts` і `clients.ts`, тести є там |
| `currentUser` (`require-role.ts`), `login` (`login/actions.ts`) | 2 | навмисна | лишено: прості ранні виходи; `currentUser` тепер виконує і `tests/scheduling/client-card-action.test.ts` |
| лінтер: `vi.mock("@/lib/auth/require-role")` у `tests/scheduling/client-card-action.test.ts` | 1 | справжня | виправлено: мокаємо лише клієнт Supabase, `requireRole` справжній |

## B. Якість тестів

### Рівень для кожного AC

| AC | Де живе правило | Рівень | Чому | Тест |
|---|---|---|---|---|
| AC-CARD-06 | політика `clients_insert_staff` ([міграція](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/supabase/migrations/20261021155328_roles_and_clients.sql#L74)); дозвіл у дії `canCreateCards`; текст — `errorCode` і `MESSAGES` | база (PGlite) + SQL-мутант; unit для дії й тексту; e2e для сторінки без форми | відмову тримає RLS, і довести її може лише справжній SQL; мок клієнта цього не доводить. Текст і те, що форму не показано, — на сторінці, а її Vitest не рендерить | [база](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/db/client-cards.test.ts#L159), [дія](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/client-card-action.test.ts#L139), [текст](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/clients.test.ts#L61) |
| AC-CARD-12 | чиста `validateCard` ([код](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/src/lib/scheduling/clients.ts#L37)); запасна межа — `clients_intake_check` і `clients_full_name_check` | unit + Stryker; база (PGlite) + SQL-мутант; e2e для показу біля полів | межі й перелік помилок перевіряються за мілісекунди, і мутації знаходять пропущену межу. Правило двічі: прямий запит оминає TS, тому база перевіряється окремо | [unit](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/clients.test.ts#L125), [дія зберігає введене](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/client-card-action.test.ts#L95), [база](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/db/client-cards.test.ts#L113) |
| AC-CARD-16 | чиста `missingCardText` ([код](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/src/lib/scheduling/clients.ts#L96)); рядка немає — сторінка `clients/[id]`; чужа картка для терапевта — `is_own_client` | unit + Stryker для тексту за роллю; база + SQL-мутант для відмови терапевту (AC-CARD-05); e2e для сторінки | неіснуючий рядок база не поверне за будь-якої політики, тож тут немає чого мутувати в SQL. Вибір тексту — TS, а зв'язок сторінки з ним доводить лише браузер | [unit](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/clients.test.ts#L219), [база, чужа картка](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/db/own-clients.test.ts#L97) |

### Покриття

`npm run test:coverage`, 2026-11-03. Підлога `vitest.coverage.config.mts`: рядки й оператори 90 %, гілки 85 %, функції 90 % на файл, лише для доменних модулів; порогу на загальний відсоток немає.

| Файл за AC | Рядки | Гілки | Чим доведено, якщо 0 % |
|---|---|---|---|
| `src/lib/scheduling/clients.ts` | 100 % | 93,65 % | — |
| `src/lib/scheduling/messages.ts` | 100 % | 100 % | — |
| `src/lib/auth/roles.ts` | 100 % | 100 % | — |
| `src/lib/auth/access.ts` | 100 % | 100 % | — |
| `src/lib/auth/require-role.ts` | 100 % | 60 % | гілки редіректів для входу й ролі: e2e (трек C) |
| `src/app/clients/actions.ts` | 100 % | 100 % | — |
| `src/app/clients/new/page.tsx` | 0 % | 0 % | AC-CARD-06: e2e (трек C); рішення показу — `canCreateCards`, unit |
| `src/app/clients/[id]/page.tsx` | 0 % | 0 % | AC-CARD-16: e2e (трек C); текст — `missingCardText`, unit; дані — RLS, база |
| `src/app/_components/client-card-form.tsx` | 0 % | 0 % | AC-CARD-12: e2e (трек C); помилки й значення — `validateCard` і дія, unit |

### Доказ мутацією

Тести проти вижилих написала окрема сесія агента, що не писала цей код, з тексту AC; кожен тест вона бачила червоним на мутації. Прогін нижче відтворюється: `npm run mutation:ts -- --mutate "src/lib/scheduling/clients.ts,src/lib/scheduling/messages.ts,src/lib/auth/access.ts,src/app/clients/actions.ts"`.

| Мутант (файл:рядок, що змінено) | AC під загрозою | До | Тест, посилений з тексту AC | Після |
|---|---|---|---|---|
| `messages.ts:63` `&&` → `\|\|` | AC-CARD-06 | вижив | [«відмова в запису до іншої таблиці»](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/messages.test.ts#L41): текст стосується лише створення карток | убитий |
| `messages.ts:63` `error.code === "42501"` → `true` | AC-CARD-06 | вижив | [«помилка іншого коду зі згадкою таблиці clients»](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/messages.test.ts#L45) | убитий |
| `messages.ts:63` `'table "clients"'` → `""` | AC-CARD-06 | вижив | [«відмова в запису до іншої таблиці»](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/messages.test.ts#L41) | убитий |
| `clients.ts:27` `?? ""` → `?? "Stryker was here!"` | AC-CARD-12 | вижив | [«три повідомлення біля полів… введене лишається у формі»](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/client-card-action.test.ts#L95): без мови, як надсилає браузер | убитий |
| `clients.ts:38` `?? ""` → `?? "Stryker was here!"` | AC-CARD-12 | без покриття | [«поля немає в запиті»](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/clients.test.ts#L153) | убитий |
| `messages.ts:54` `"BIRTH_DATE_INVALID"` → `""` | AC-CARD-12 | вижив | [«база відхилила дату народження»](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/clients.test.ts#L163): «Enter a date of birth that is not in the future.» | убитий |
| `clients.ts:33` прибрано `$` у `VALID_EMAIL` | AC-HOLD-39 (форма AC-CARD-12) | вижив | [«зайве після коректної адреси»](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/clients.test.ts#L187): другий «@» чи пробіл усередині | убитий |
| `clients.ts:7` `?? ""` → `?? "Stryker was here!"` | AC-CARD-03, AC-HOLD-11 | без покриття | [опікун](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/clients.test.ts#L55), [ім'я](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/clients.test.ts#L265) | убитий |
| `messages.ts:73` `&&` → `\|\|` і вся умова → `true` | технічний, текст з `?error=` | вижив | [«назва властивості об'єкта JS»](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/clients.test.ts#L297): `?error=constructor` не показує нічого | убитий |
| `messages.ts:73` `typeof code === "string"` → `true` | технічний | вижив | [«не рядок»](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/clients.test.ts#L303) | убитий |
| `messages.ts:64` умова → `true` | технічний | вижив | [«назва обмеження в помилці, що не є його порушенням»](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/messages.test.ts#L56) | убитий |
| `messages.ts:65` `?.[1]` → `[1]` | технічний | вижив | [«порушення без назви обмеження»](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/messages.test.ts#L62) | убитий |
| `messages.ts:68` `"UNKNOWN"` → `""` | технічний | без покриття | [«помилка, для якої немає правила PM»](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/tests/scheduling/messages.test.ts#L51) | убитий |

- Stryker, чотири модулі за трьома AC: **до** 91,56 % (217 вбито, 15 вижило, 5 без покриття) → **після** 97,47 % (231 вбито, 5 вижило, 1 без покриття). `src/lib/auth/roles.ts` (за ним `canCreateCards`) окремо: 68,75 % (11 вбито, 5 вижило). Опис PR — вивід «до» і «після».
- SQL-мутації (`npm run mutation:sql -- --markdown`), 7 із 7 вбито:

| Мутант | AC | Що зламано | Вердикт | Який тест упав |
|---|---|---|---|---|
| C1 | AC-CARD-06 | `clients_insert_staff`: картку створює будь-хто з входом | KILLED | AC-CARD-06: therapist1 не створює картку; AC-CARD-11: newuser1 |
| C2 | AC-CARD-06 | `clients_insert_staff`: до дозволених ролей додано therapist | KILLED | AC-CARD-06: therapist1 не створює картку |
| C3 | AC-CARD-12 | `clients_intake_check`: дата народження в майбутньому дозволена | KILLED | AC-CARD-12: нова картка без дати чи мови, або з датою в майбутньому |
| C4 | AC-CARD-12 | `clients_intake_check`: мова сеансів може бути будь-якою | KILLED | AC-CARD-12: нова картка без дати чи мови, або з датою в майбутньому |
| C5 | AC-CARD-12 | `clients_full_name_check`: порожнє ім'я дозволене | KILLED | AC-HOLD-11: порожнє ім'я; AC-HOLD-41: ім'я з самих пробілів |
| C6 | AC-CARD-05, AC-CARD-16 | `clients_select_own_for_therapist`: терапевт бачить усі картки | KILLED | AC-CARD-04, 05, 08, 09, 11, 14 |
| C7 | AC-CARD-05, AC-CARD-16 | `is_own_client`: клієнт із чужим утриманням теж свій | KILLED | AC-CARD-04, 05, 08, 09 |

- Вижилі, що лишились:
  - `clients.ts:50`, прибрано `^` або `$` у виразі дати — еквівалентні: дату приймає лише `toISOString().slice(0, 10) === birthDate` у [рядку 51](https://github.com/markkern-hyra/therapy-scheduling/blob/70129fe707476d665cd71269e30b21d675ae8826/src/lib/scheduling/clients.ts#L51), тож вхід має рівно 10 символів, а на них послаблений вираз збігається лише на всьому рядку. Перевірено перебором близько 400 тисяч входів на всіх трьох варіантах коду: розбіжностей немає.
  - `messages.ts:60`, `?? ""` → `?? "Stryker was here!"` — еквівалентний: цей рядок не дорівнює жодному коду, не згадує `table "clients"` і `constraint "…"`, тож результат і далі `UNKNOWN`.
  - `clients.ts:107` (пошук, AC-CARD-02) і `actions.ts:23` (назви `"clients"`, `"id"` у записі, AC-CARD-01) — поза трьома AC. `actions.ts:23` мок не розрізнить; запис перевірено на базі й у браузері.
  - `roles.ts:13`, `role !== null` → `true` — еквівалентний: `includes(null)` і так дає `false`, умова потрібна лише для типів TypeScript.
  - `roles.ts:6`, `ROLE_LABELS` (4 мутанти) — підпис ролі в шапці, поза трьома AC; бачить лише браузер.
- Відома межа: `clients_intake_check` охоплює і дату, і мову, а `errorCode` показує для нього лише текст про дату. Форму це не зачіпає: `validateCard` спрацьовує раніше й дає «Select a session language.». Хибний текст можливий лише для запиту в обхід форми, який цього тексту не показує.

## C. UAT на проді

| AC | Специфікація | Тест (твердження) | Агент | Вердикт | Кадр |
|---|---|---|---|---|---|
| AC-…-NN | <!-- …/blob/<sha>/tests/e2e/….spec.ts --> | <!-- passed / failed --> | <!-- Haiku: PASS / FAIL / NEEDS-HUMAN (+ Sonnet, якщо була суперечка) --> | <!-- PASS / FAIL / NEEDS-HUMAN і правило (R1–R6) --> | <!-- …/blob/<sha>/docs/qa/uat/<дата>/frames/AC-…-then-1.png --> |

- Звіт: <!-- …/blob/<sha>/docs/qa/uat/<YYYY-MM-DD>/report.md -->
- Відео: <!-- вкладення в описі PR …/pull/N -->
- Рецензент: <!-- моделі зі звіту (claude-haiku-5-5; суперечки — claude-sonnet-5-5) і вартість прогону -->
- Негативний контроль: <!-- NC-… (npm run uat:nc): що навмисно хибне, вердикт (FAIL / NEEDS-HUMAN), …/pull/N -->
- Дані: <!-- «лише читання» або «@writes: uat-<запуск>@example.test, рядок «Прибирання» зі звіту» -->

### Приймання PM

| AC | Рішення PM | Посилання |
|---|---|---|
| AC-…-NN | <!-- ✅ / ❌ / NEEDS-HUMAN → … --> | <!-- коментар-підпис або issue «Відхилення від вимог» --> |

## D. Eval рецензента

- PR з вадами (не злитий): <!-- …/pull/N -->
- Ключ і таблиця: <!-- …/pull/N#issuecomment-M -->

| # | Вада (ключ) | CodeRabbit | `/code-review high` |
|---|---|---|---|
| 1 | <!-- категорія і файл:рядок --> | <!-- знайшов / пропустив + цитата --> | <!-- знайшов / пропустив + цитата --> |
| 2 | … | … | … |
| 3 | … | … | … |
| П | приманка: <!-- що --> | <!-- хибна тривога? цитата --> | <!-- хибна тривога? цитата --> |

- Інші знахідки: <!-- слушна / шум, по рядку на кожну -->
- Правило, що закриває пропуск: <!-- рядок в AGENTS.md чи path instruction, …/commit/<sha> -->
- Повторний прогін: <!-- хто, результат, цитата, …/pull/N#issuecomment-M -->
