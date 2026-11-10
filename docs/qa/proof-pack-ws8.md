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
- `/api/health` на момент UAT: sha f512871, db ok, 03.11.2026

## 3 AC

| AC | Вид | «Тоді» (дослівно з вимоги PM) |
|---|---|---|
| AC-CARD-06 | відмова в браузері (заборонена роль) | форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.», і кількість карток клієнтів не змінилася. |
| AC-CARD-12 | стан інтерфейсу (помилка) | картку не створено, scheduler1 одразу бачить три повідомлення біля відповідних полів — «Enter the client's name.», «Enter a date of birth that is not in the future.» і «Select a session language.», а всі введені дані лишаються у формі. |
| AC-CARD-16 | відмова в браузері й стан інтерфейсу | scheduler1 бачить повідомлення «This client card doesn't exist.», therapist1 — «You don't have access to this client.», і жоден із них не бачить жодних даних клієнтів. |

## A. Ворота

- PR воріт: https://github.com/markkern-hyra/therapy-scheduling/pull/30
- Зелений `quality` на `main`: https://github.com/markkern-hyra/therapy-scheduling/actions/runs/41618737448
- Обов'язкові перевірки в `solo-main`: «Ворота: fallow audit» і «Покриття: доменна підлога» додано 2026-11-03, після зеленого прогону на `main`; разом із `spec`, `app`, `conformance`, `db-check`. «Порада: вразливі залежності» лишається дорадчою

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
| AC-CARD-06 | політика `clients_insert_staff` ([міграція](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/supabase/migrations/20261021155328_roles_and_clients.sql#L74)); дозвіл у дії `canCreateCards`; текст — `errorCode` і `MESSAGES` | база (PGlite) + SQL-мутант; unit для дії й тексту; e2e для сторінки без форми | відмову тримає RLS, і довести її може лише справжній SQL; мок клієнта цього не доводить. Текст і те, що форму не показано, — на сторінці, а її Vitest не рендерить | [база](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/db/client-cards.test.ts#L175), [дія](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/client-card-action.test.ts#L141), [текст](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/clients.test.ts#L61), [e2e](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/e2e/client-cards.spec.ts#L33) |
| AC-CARD-12 | чиста `validateCard` ([код](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/src/lib/scheduling/clients.ts#L37)); запасна межа — `clients_intake_check` і `clients_full_name_check` | unit + Stryker; база (PGlite) + SQL-мутант; e2e для показу біля полів | межі й перелік помилок перевіряються за мілісекунди, і мутації знаходять пропущену межу. Правило двічі: прямий запит оминає TS, тому база перевіряється окремо | [unit](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/clients.test.ts#L125), [дія зберігає введене](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/client-card-action.test.ts#L97), [база](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/db/client-cards.test.ts#L114), [e2e](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/e2e/client-cards.spec.ts#L76) |
| AC-CARD-16 | чиста `missingCardText` ([код](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/src/lib/scheduling/clients.ts#L96)); рядка немає — сторінка `clients/[id]` | unit + Stryker для тексту за роллю; e2e для сторінки | неіснуючий рядок база не поверне за будь-якої політики, тож SQL-мутанта для цього AC немає. Вибір тексту — TS, а зв'язок сторінки з ним доводить лише браузер | [unit](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/clients.test.ts#L219), [e2e](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/e2e/client-cards.spec.ts#L148) |

### Покриття

`npm run test:coverage`, 2026-11-03. Підлога `vitest.coverage.config.mts`: рядки й оператори 90 %, гілки 85 %, функції 90 % на файл, лише для доменних модулів; порогу на загальний відсоток немає.

Vitest не рендерить сторінки, тому файли з 0 % доводять e2e-специфікації треку C (звіт — розділ C). Кожна доводить лише гілки, які проходить її сценарій; решту нижче позначено як не доведену.

| Файл за AC | Рядки | Гілки | Чим доведено, якщо 0 % |
|---|---|---|---|
| `src/lib/scheduling/clients.ts` | 100 % | 93,65 % | — |
| `src/lib/scheduling/messages.ts` | 100 % | 100 % | — |
| `src/lib/auth/roles.ts` | 100 % | 100 % | — |
| `src/lib/auth/access.ts` | 100 % | 100 % | — |
| `src/lib/auth/require-role.ts` | 100 % | 60 % | гілки без сесії чи ролі (редіректи) і з помилкою запиту профілю: **e2e не доведено**, усі три сценарії йдуть із сесією й роллю. Рішення про редірект — `accessFor`, unit |
| `src/app/clients/actions.ts` | 100 % | 100 % | — |
| `src/app/clients/new/page.tsx` | 0 % | 0 % | обидві гілки, e2e: AC-CARD-06 (терапевт, відмова без форми) і AC-CARD-12 (планувальник, форма); рішення показу — `canCreateCards`, unit |
| `src/app/clients/[id]/page.tsx` | 0 % | 0 % | лише картка, якої немає: AC-CARD-16, e2e; текст — `missingCardText`, unit. Показ наявної картки (поза трьома AC), адреса не у форматі UUID і помилка запиту до бази — **e2e не доведено**; тесту на адресу не у форматі UUID немає на жодному рівні |
| `src/app/_components/client-card-form.tsx` | 0 % | 0 % | AC-CARD-12, e2e: тип «Child», три помилки біля полів, введене лишається; помилки й значення — `validateCard` і дія, unit. Поля дорослого, помилки типу клієнта й полів опікуна, `Alert` відмови бази і стан «Creating…» — **e2e не доведено** |

### Доказ мутацією

Прогін відтворюється: `npm run mutation:ts -- --mutate "src/lib/scheduling/clients.ts,src/lib/scheduling/messages.ts,src/lib/auth/access.ts,src/app/clients/actions.ts"`. Тести на мутанти Stryker написала окрема сесія агента, що не писала цей код, і кожен бачила червоним на мутації. Незалежна рецензія після цього знайшла ще одну межу: мутант C8 нижче; цей тест і зміну мітки AC дописала основна сесія.

Мутанти на рядках трьох AC:

| Мутант (файл:рядок, що змінено) | AC під загрозою | До | Тест, посилений з тексту AC | Після |
|---|---|---|---|---|
| `20261026104702_client_cards.sql` `clients_intake_check`: `::date` → `::date + 1` (C8) | AC-CARD-12 | вижив: тест брав дату на два дні вперед | [«нова картка… з датою в майбутньому»](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/db/client-cards.test.ts#L114): межа «2026-11-04 при сьогодні 2026-11-03», наступний день за часом практики | убитий |
| `clients.ts:27` `?? ""` → `?? "Stryker was here!"` | AC-CARD-12 | вижив | [«три повідомлення біля полів… введене лишається у формі»](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/client-card-action.test.ts#L97): без мови, як надсилає браузер | убитий |
| `clients.ts:38` `?? ""` → `?? "Stryker was here!"` | AC-CARD-12, лише прямий виклик `validateCard` (`cardValues` заповнює всі ключі) | без покриття | [«поля немає в запиті»](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/clients.test.ts#L153) | убитий |
| `clients.ts:33` прибрано `$` у `VALID_EMAIL` | AC-HOLD-39 | вижив | [«зайве після коректної адреси»](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/clients.test.ts#L187): другий «@» чи пробіл усередині | убитий |

Технічні мутанти без AC: «Тоді» трьох AC від них не страждає; вони стережуть загальні гілки. Очікування — з коментарів коду, тож назви тестів без AC ID.

| Мутант | До | Тест | Після |
|---|---|---|---|
| `messages.ts:63` `&&` → `\|\|`, ліва частина → `true`, `'table "clients"'` → `""`: текст про картки в інших помилках | вижив | [інша таблиця](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/messages.test.ts#L42), [інший код](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/messages.test.ts#L46) | убитий |
| `messages.ts:54` `"BIRTH_DATE_INVALID"` → `""` | вижив | [текст](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/clients.test.ts#L163); [справжня помилка бази](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/db/client-cards.test.ts#L132) | убитий |
| `messages.ts:73` `&&` → `\|\|`, умова → `true`, `typeof` → `true` | вижив | [`?error=constructor`](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/clients.test.ts#L292), [не рядок](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/clients.test.ts#L303) | убитий |
| `messages.ts:64` умова → `true`; `:65` `?.[1]` → `[1]`; `:68` `"UNKNOWN"` → `""` | вижив, вижив, без покриття | [не порушення](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/messages.test.ts#L57), [без назви](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/messages.test.ts#L63), [немає правила](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/messages.test.ts#L52) | убитий |
| `clients.ts:7` `?? ""` → `?? "Stryker was here!"`: у продукті недосяжно, `validateCard` відхиляє такий запит раніше | без покриття | [опікун](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/clients.test.ts#L55), [ім'я](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/scheduling/clients.test.ts#L265) | убитий |
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
  - `clients.ts:50`, прибрано `^` або `$` у виразі дати — еквівалентні: дату приймає лише `toISOString().slice(0, 10) === birthDate` у [наступному рядку](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/src/lib/scheduling/clients.ts#L51), тож вхід має рівно 10 символів, а на них послаблений вираз збігається лише на всьому рядку. Два незалежні разові перебори (400 і 533 тисячі входів, скрипта в репо немає) розбіжностей не дали.
  - `messages.ts:60`, `?? ""` → `?? "Stryker was here!"` — еквівалентний: цей рядок не дорівнює жодному коду, не згадує `table "clients"` і `constraint "…"`, тож результат і далі `UNKNOWN`.
  - `roles.ts:13`, `role !== null` → `true` — еквівалентний: `includes(null)` і так дає `false`, умова потрібна лише для типів TypeScript.
  - `clients.ts:107` (пошук, AC-CARD-02), `actions.ts:23` `"id"` (мок не читає колонки) і `roles.ts:6` `ROLE_LABELS` (4 мутанти, підпис ролі в шапці) — поза трьома AC.
- Відома межа: `clients_intake_check` охоплює і дату, і мову, а `errorCode` показує для нього лише текст про дату. Форму це не зачіпає: `validateCard` спрацьовує раніше й дає «Select a session language.». Хибний текст можливий лише для запиту в обхід форми, який цього тексту не показує.

## C. UAT на проді

| AC | Специфікація | Тест (твердження) | Агент | Вердикт | Кадр |
|---|---|---|---|---|---|
| AC-CARD-06 | [client-cards.spec.ts](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/e2e/client-cards.spec.ts#L33) | passed | Haiku: PASS | PASS, R6 | [кадр](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/docs/qa/uat/2026-11-03/frames/AC-CARD-06-then-1.png) |
| AC-CARD-12 | [client-cards.spec.ts](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/e2e/client-cards.spec.ts#L76) | passed | Haiku: PASS | PASS, R6 | [кадр](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/docs/qa/uat/2026-11-03/frames/AC-CARD-12-then-1.png) |
| AC-CARD-16 | [client-cards.spec.ts](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/tests/e2e/client-cards.spec.ts#L148) | passed | Haiku: PASS | PASS, R6 | [планувальник](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/docs/qa/uat/2026-11-03/frames/AC-CARD-16-then-1.png), [терапевт](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/docs/qa/uat/2026-11-03/frames/AC-CARD-16-then-2.png) |

- Звіт: [report.md](https://github.com/markkern-hyra/therapy-scheduling/blob/f304fa6b5090485b3b7b310918a74d959e8772fb/docs/qa/uat/2026-11-03/report.md): прод `f512871`, тести `117f6ef`, прогін 03.11.2026, 17:09 за Києвом
- Відео: вкладення в описі [PR](https://github.com/markkern-hyra/therapy-scheduling/pull/35)
- Рецензент: `claude-haiku-5-5`, суперечки — `claude-sonnet-5-5`. Розбір трьох AC: $0.0063 за цінами API, суперечок не було
- Негативний контроль (`npm run uat:nc`, ті самі прод і тести, $0.0431; рядки звіту — в описі [PR](https://github.com/markkern-hyra/therapy-scheduling/pull/35)):
  - NC-1: у твердженні навмисно інший текст відмови → **FAIL, R1**. Haiku сказав PASS, але агент не перекриває впале твердження.
  - NC-2: в анотації `ac-text` навмисно інший текст «Тоді», твердження й застосунок без змін → **NEEDS-HUMAN, R3**. Haiku і Sonnet: FAIL.
- Дані: лише читання; рядок «Прибирання» зі звіту: видалено 0, лишилось 0
- Перший прогін (прод `89cb6b4`): три AC — PASS, NC-1 — FAIL R1, але NC-2 — FAIL R1 не через текст, а через тайм-аут хука `attachRuntimeErrors`. Механізм відтворено на локальному сервері: запит, перерваний наступним `page.goto`, не дає ні відповіді, ні помилки, і `r.response()` чекає до тайм-ауту тесту. Який саме запит висів на проді, не зафіксовано; непрямий доказ — NC-1 і NC-2 після виправлення тривали 11,7 і 6,5 с замість 67,2 і 61,5 с, а NC-2 дав очікуваний R3.
- Виправлення: очікування обмежено 5 с — єдине відхилення від матеріалу курсу в `tests/e2e/support/uat.ts`. Наслідок для R5: запит без відповіді за 5 с не рахується ні 5xx, ні збоєм. Завершені запити, помилки сторінки й консолі це не зачіпає, а поломку головного документа чи дії ловлять твердження. На вердикти трьох AC межа не вплинула: хук у них зайняв 0,25–0,45 с.
- Обидва прогони запущено заново на коміті `117f6ef`; після нього в коді змінено лише коментарі. Вердикти руками не правлено, промпт і схему рецензента не змінено.

### Приймання PM

| AC | Рішення PM | Посилання |
|---|---|---|
| AC-CARD-06 | ✅ прийнято PM 03.11.2026 | [коментар PM у #35](https://github.com/markkern-hyra/therapy-scheduling/pull/35#issuecomment-6609874893) |
| AC-CARD-12 | ✅ прийнято PM 03.11.2026 | [коментар PM у #35](https://github.com/markkern-hyra/therapy-scheduling/pull/35#issuecomment-6609874893) |
| AC-CARD-16 | ✅ прийнято PM 03.11.2026 | [коментар PM у #35](https://github.com/markkern-hyra/therapy-scheduling/pull/35#issuecomment-6609874893) |

## D. Eval рецензента

- PR з вадами (не злитий): https://github.com/markkern-hyra/therapy-scheduling/pull/36
- Ключ і таблиця: https://github.com/markkern-hyra/therapy-scheduling/pull/36#issuecomment-6609830440
- Рецензенти: CodeRabbit, профіль `assertive`; `/code-review high` окремим процесом `claude -p` за командою з гайду курсу, модель `claude-opus-5-5` за `modelUsage`, $0.73 і $0.71 за цінами API. Процес не мав контексту сесії, що садила вади, і не читав ключа. CI на PR зелений, тож вади пройшли всі обов'язкові перевірки.

| # | Вада (ключ) | CodeRabbit | `/code-review high` |
|---|---|---|---|
| 1 | права в даних, `supabase/migrations/20261103160101_holds_update_grants.sql:2`: `client_id` у колонковому гранті, терапевт читає чужу картку | знайшов, Major: «Терапевт з активним утриманням на власному слоті може перенаправити його на будь-якого існуючого клієнта. Тоді `is_own_client` відкриває цьому терапевту картку клієнта» | знайшов: «Новий grant update (client_id) дає терапевту змінити клієнта у власному утриманні в обхід CONFIRM_FORBIDDEN і так отримати доступ до чужої картки клієнта.» |
| 2 | тести, `tests/db/hold-confirm.test.ts:71`: у тесті AC-HOLD-12 `toBeGreaterThan(2000)` → `toBeGreaterThanOrEqual(2000)` | знайшов, лише Minor: «Зі змінами `toBeGreaterThanOrEqual(2000)` тест проходить і тоді, коли `confirmed_at` містить значення клієнта `2000-01-01T00:00:00Z`.» | знайшов: «Заміна на toBeGreaterThanOrEqual(2000) робить тест «час підтвердження ставить база» беззмістовним: значення від клієнта теж має рік 2000.» |
| 3 | логіка, `src/app/holds/page.tsx:66`: кнопка «Confirm» і на «Expired» | знайшов, лише Minor: «Умова `hold.status !== "Confirmed"` показує «Confirm» і для прострочених утримань.» | знайшов: «Умова `hold.status !== \"Confirmed\"` показує кнопку «Confirm» і на прострочених утриманнях, хоча підтвердити можна лише «Held».» |
| П | приманка: перевірки ролі й полів винесено в `cardRefusal`, поведінка та сама | хибної тривоги немає: «У `src/app/clients/actions.ts` змінено лише локальне винесення перевірки ролі та валідації» | хибної тривоги щодо поведінки немає, зауваження до стилю, слушне за правилом `AGENTS.md` про хелпер «з другого повтору»: «Хелпер cardRefusal має одного виклику й поєднує авторизацію з валідацією полів без спільної логіки, яку варто було б виносити.» |

- Інші знахідки:
  - `/code-review`, слушна: «Зміна client_id через update обходить правила check_new_hold і незмінність підтвердженого сеансу»;
  - `/code-review`, слушна, стосувалась і `main`: «Тест «інші колонки утримання через update не змінюються» перевіряє лише expires_at». Закрито в https://github.com/markkern-hyra/therapy-scheduling/pull/38: тест перебирає колонки й ролі, він червоний на посадженому гранті й зелений без нього;
  - `/code-review`, слушна: «Міграція суперечить прийнятому рішенню design.md, за яким update у holds дозволено лише для `confirmed_at`, і не має нового ADR.»;
  - `/code-review`, слушна: «Grant повторює вже видане право на confirmed_at»;
  - CodeRabbit, слушна, перевірка «AC ID у тестах і матриці»: «PR змінює поведінку в `src/app/holds/page.tsx`: для `Expired` тепер показується `Confirm`»;
  - CodeRabbit, шум, перевірка опису: «Чекліст заповнено, але два пункти не відмічено» — ці пункти чекали на CI;
  - слабке місце CodeRabbit: формальна перевірка міграцій пройшла («Перевірку пройдено. У PR додано одну міграцію без створення таблиці, політики або security definer-функції.»), хоча inline-коментар на тому самому рядку — Major. Її інструкція згадує лише колонки ролі й статусу.
- Правило, що закриває пропуск: пропуску не було, обидва знайшли 3 вади з 3, тож правило загострює найслабшу знахідку — ваду 2, якій CodeRabbit дав Minor. Рядок в `AGENTS.md`: послаблення твердження в тесті з AC ID є «must fix». https://github.com/markkern-hyra/therapy-scheduling/pull/37, https://github.com/markkern-hyra/therapy-scheduling/commit/f03b6028691c8e10b6a92d22bafecf3d2b0920a6
- Повторний прогін: https://github.com/markkern-hyra/therapy-scheduling/pull/36#issuecomment-6611217257. `/code-review` застосував правило: «AGENTS.md: «Послаблення твердження в такому тесті — нижча межа (`>` → `>=`) … — помилка рівня «must fix»». Виняток — новий текст AC від PM, а PR заявляє «Нових AC немає».» CodeRabbit — **без змін, знову Minor**, правило не цитує: «Перевірка `toBeGreaterThanOrEqual(2000)` пройде, навіть якщо база збереже значення клієнта без заміни.» Тобто для нього цей рядок ваду не загострив. Це по одному прогону кожного рецензента, вибірка, а не гарантія; ключ на той час уже був у PR, `/code-review` його не читав, а для CodeRabbit перевірити цього не можу.
