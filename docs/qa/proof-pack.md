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
| AC-CARD-06 | політика `clients_insert_staff` ([міграція](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/supabase/migrations/20261021155328_roles_and_clients.sql#L74)); дозвіл у дії `canCreateCards`; текст — `errorCode` і `MESSAGES` | база (PGlite) + SQL-мутант; unit для дії й тексту; e2e для сторінки без форми | відмову тримає RLS, і довести її може лише справжній SQL; мок клієнта цього не доводить. Текст і те, що форму не показано, — на сторінці, а її Vitest не рендерить | [база](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/db/client-cards.test.ts#L175), [дія](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/client-card-action.test.ts#L141), [текст](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/clients.test.ts#L61) |
| AC-CARD-12 | чиста `validateCard` ([код](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/src/lib/scheduling/clients.ts#L37)); запасна межа — `clients_intake_check` і `clients_full_name_check` | unit + Stryker; база (PGlite) + SQL-мутант; e2e для показу біля полів | межі й перелік помилок перевіряються за мілісекунди, і мутації знаходять пропущену межу. Правило двічі: прямий запит оминає TS, тому база перевіряється окремо | [unit](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/clients.test.ts#L125), [дія зберігає введене](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/client-card-action.test.ts#L97), [база](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/db/client-cards.test.ts#L114) |
| AC-CARD-16 | чиста `missingCardText` ([код](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/src/lib/scheduling/clients.ts#L96)); рядка немає — сторінка `clients/[id]` | unit + Stryker для тексту за роллю; e2e для сторінки | неіснуючий рядок база не поверне за будь-якої політики, тож SQL-мутанта для цього AC немає. Вибір тексту — TS, а зв'язок сторінки з ним доводить лише браузер | [unit](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/clients.test.ts#L219) |

### Покриття

`npm run test:coverage`, 2026-11-03. Підлога `vitest.coverage.config.mts`: рядки й оператори 90 %, гілки 85 %, функції 90 % на файл, лише для доменних модулів; порогу на загальний відсоток немає.

Файли з 0 % мають довести e2e-специфікації треку C. **Поки їх немає, ці рядки заплановано, а не доведено.**

| Файл за AC | Рядки | Гілки | Чим доведено, якщо 0 % |
|---|---|---|---|
| `src/lib/scheduling/clients.ts` | 100 % | 93,65 % | — |
| `src/lib/scheduling/messages.ts` | 100 % | 100 % | — |
| `src/lib/auth/roles.ts` | 100 % | 100 % | — |
| `src/lib/auth/access.ts` | 100 % | 100 % | — |
| `src/lib/auth/require-role.ts` | 100 % | 60 % | гілки редіректів для входу й ролі: заплановано e2e |
| `src/app/clients/actions.ts` | 100 % | 100 % | — |
| `src/app/clients/new/page.tsx` | 0 % | 0 % | AC-CARD-06: заплановано e2e; рішення показу — `canCreateCards`, unit |
| `src/app/clients/[id]/page.tsx` | 0 % | 0 % | AC-CARD-16: заплановано e2e; текст — `missingCardText`, unit |
| `src/app/_components/client-card-form.tsx` | 0 % | 0 % | AC-CARD-12: заплановано e2e; помилки й значення — `validateCard` і дія, unit |

### Доказ мутацією

Прогін відтворюється: `npm run mutation:ts -- --mutate "src/lib/scheduling/clients.ts,src/lib/scheduling/messages.ts,src/lib/auth/access.ts,src/app/clients/actions.ts"`. Тести на мутанти Stryker написала окрема сесія агента, що не писала цей код, і кожен бачила червоним на мутації. Незалежна рецензія після цього знайшла ще одну межу: мутант C8 нижче; цей тест і зміну мітки AC дописала основна сесія.

Мутанти на рядках трьох AC:

| Мутант (файл:рядок, що змінено) | AC під загрозою | До | Тест, посилений з тексту AC | Після |
|---|---|---|---|---|
| `20261026104702_client_cards.sql` `clients_intake_check`: `::date` → `::date + 1` (C8) | AC-CARD-12 | вижив: тест брав дату на два дні вперед | [«нова картка… з датою в майбутньому»](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/db/client-cards.test.ts#L114): межа «2026-11-04 при сьогодні 2026-11-03», наступний день за часом практики | убитий |
| `clients.ts:27` `?? ""` → `?? "Stryker was here!"` | AC-CARD-12 | вижив | [«три повідомлення біля полів… введене лишається у формі»](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/client-card-action.test.ts#L97): без мови, як надсилає браузер | убитий |
| `clients.ts:38` `?? ""` → `?? "Stryker was here!"` | AC-CARD-12, лише прямий виклик `validateCard` (`cardValues` заповнює всі ключі) | без покриття | [«поля немає в запиті»](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/clients.test.ts#L153) | убитий |
| `clients.ts:33` прибрано `$` у `VALID_EMAIL` | AC-HOLD-39 | вижив | [«зайве після коректної адреси»](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/clients.test.ts#L187): другий «@» чи пробіл усередині | убитий |

Технічні мутанти без AC: «Тоді» трьох AC від них не страждає; вони стережуть загальні гілки. Очікування — з коментарів коду, тож назви тестів без AC ID.

| Мутант | До | Тест | Після |
|---|---|---|---|
| `messages.ts:63` `&&` → `\|\|`, ліва частина → `true`, `'table "clients"'` → `""`: текст про картки в інших помилках | вижив | [інша таблиця](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/messages.test.ts#L42), [інший код](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/messages.test.ts#L46) | убитий |
| `messages.ts:54` `"BIRTH_DATE_INVALID"` → `""` | вижив | [текст](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/clients.test.ts#L163); [справжня помилка бази](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/db/client-cards.test.ts#L132) | убитий |
| `messages.ts:73` `&&` → `\|\|`, умова → `true`, `typeof` → `true` | вижив | [`?error=constructor`](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/clients.test.ts#L292), [не рядок](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/clients.test.ts#L303) | убитий |
| `messages.ts:64` умова → `true`; `:65` `?.[1]` → `[1]`; `:68` `"UNKNOWN"` → `""` | вижив, вижив, без покриття | [не порушення](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/messages.test.ts#L57), [без назви](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/messages.test.ts#L63), [немає правила](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/messages.test.ts#L52) | убитий |
| `clients.ts:7` `?? ""` → `?? "Stryker was here!"`: у продукті недосяжно, `validateCard` відхиляє такий запит раніше | без покриття | [опікун](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/clients.test.ts#L55), [ім'я](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/tests/scheduling/clients.test.ts#L265) | убитий |
| `actions.ts:23` `"clients"` → `""` (запис, AC-CARD-01) | вижив | мок приймає лише таблицю `clients` | убитий |

- Stryker, чотири модулі за трьома AC: **до** 91,56 % (217 вбито, 15 вижило, 5 без покриття) → **після** 97,89 % (232 вбито, 4 вижило, 1 без покриття). `src/lib/auth/roles.ts` (за ним `canCreateCards`) окремо: 68,75 % (11 вбито, 5 вижило). Вивід «до» і «після» — в описі PR.
- SQL-мутації, вивід `npm run mutation:sql -- --markdown`, 8 із 8 вбито:

| Мутант | AC | Що зламано | Вердикт | Який тест упав |
|---|---|---|---|---|
| C1 | AC-CARD-06 | clients_insert_staff: картку створює будь-хто з входом | KILLED | AC-CARD-06: therapist1 не створює картку — відмова, кількість карток та сама; AC-CARD-11: newuser1 без ролі не бачить і не створює карток, картки не змінились |
| C2 | AC-CARD-06 | clients_insert_staff: до дозволених ролей додано therapist | KILLED | AC-CARD-06: therapist1 не створює картку — відмова, кількість карток та сама |
| C3 | AC-CARD-12 | clients_intake_check: дата народження в майбутньому дозволена | KILLED | AC-CARD-12: нова картка без дати народження чи мови, або з датою народження в майбутньому — не створено; errorCode: справжня відмова clients_intake_check через дату — код тексту про дату |
| C8 | AC-CARD-12 | clients_intake_check: межа зсунута, завтрашня дата народження дозволена | KILLED | AC-CARD-12: нова картка без дати народження чи мови, або з датою народження в майбутньому — не створено; errorCode: справжня відмова clients_intake_check через дату — код тексту про дату |
| C4 | AC-CARD-12 | clients_intake_check: мова сеансів може бути будь-якою | KILLED | AC-CARD-12: нова картка без дати народження чи мови, або з датою народження в майбутньому — не створено |
| C5 | AC-CARD-12 | clients_full_name_check: порожнє ім'я дозволене | KILLED | AC-CARD-12: нова картка без дати народження чи мови, або з датою народження в майбутньому — не створено; AC-HOLD-11: порожнє ім'я — клієнта не створено; AC-HOLD-41: ім'я з самих пробілів — не створено; « Client Four » збережено як «Client Four»; errorCode розпізнає справжні помилки бази за назвою обмеження |
| C6 | AC-CARD-05 | clients_select_own_for_therapist: терапевт бачить усі картки, а не лише своїх клієнтів | KILLED | AC-CARD-04: therapist1 бачить картки client6 і client7 з даними анкети й опікуна, client9 — ні; AC-CARD-05: therapist1 за посиланням на картку client9 не отримує жодних даних, картка не змінилась; AC-CARD-08: утримання прострочилось — client6 більше не свій для therapist1, картка не змінилась; AC-CARD-14: слот почався — client10 у therapist1 більше не свій, а client11 із минулим «Confirmed» лишається; AC-CARD-09: therapist2 без «Held» і «Confirmed» не бачить жодної картки; AC-CARD-11: у therapist1 зняли роль — не бачить і своїх клієнтів, картки не змінились |
| C7 | AC-CARD-05 | is_own_client: клієнт із чужим утриманням теж вважається своїм | KILLED | AC-CARD-04: therapist1 бачить картки client6 і client7 з даними анкети й опікуна, client9 — ні; AC-CARD-05: therapist1 за посиланням на картку client9 не отримує жодних даних, картка не змінилась; AC-CARD-08: утримання прострочилось — client6 більше не свій для therapist1, картка не змінилась; AC-CARD-09: therapist2 без «Held» і «Confirmed» не бачить жодної картки |

- Вижилі, що лишились:
  - `clients.ts:50`, прибрано `^` або `$` у виразі дати — еквівалентні: дату приймає лише `toISOString().slice(0, 10) === birthDate` у [наступному рядку](https://github.com/markkern-hyra/therapy-scheduling/blob/7c711ca543106b4257b4637c2076ae63c5e3c2ce/src/lib/scheduling/clients.ts#L51), тож вхід має рівно 10 символів, а на них послаблений вираз збігається лише на всьому рядку. Два незалежні разові перебори (400 і 533 тисячі входів, скрипта в репо немає) розбіжностей не дали.
  - `messages.ts:60`, `?? ""` → `?? "Stryker was here!"` — еквівалентний: цей рядок не дорівнює жодному коду, не згадує `table "clients"` і `constraint "…"`, тож результат і далі `UNKNOWN`.
  - `roles.ts:13`, `role !== null` → `true` — еквівалентний: `includes(null)` і так дає `false`, умова потрібна лише для типів TypeScript.
  - `clients.ts:107` (пошук, AC-CARD-02), `actions.ts:23` `"id"` (мок не читає колонки) і `roles.ts:6` `ROLE_LABELS` (4 мутанти, підпис ролі в шапці) — поза трьома AC.
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
