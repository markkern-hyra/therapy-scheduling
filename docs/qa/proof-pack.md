# QA proof pack: статус перевірки страхування в картці клієнта (зріз 3)

<!-- Шаблон: koldovsky/2026-quitcode-09-software-factory-hw/materials/templates/proof-pack.template.md. Proof pack WS8 —
     docs/qa/proof-pack-ws8.md. Жодних паролів; акаунти — лише *@example.test. -->

- Прод-URL: https://therapy-scheduling-theta.vercel.app
- Зріз 3: планувальник або адміністратор позначає в картці клієнта статус перевірки страхування («Verified», «Not accepted», «Private pay»), і кожен, хто бачить картку, бачить його; терапевт — лише в картках своїх клієнтів.
- Вимоги: https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling-spec · джерело: issues · знімок 2026-11-09 (вимога [#33](https://github.com/HryhoriiHaponiukQuitCode/therapy-scheduling-spec/issues/33))
- Спека: [`openspec/specs/insurance-status/spec.md`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/openspec/specs/insurance-status/spec.md)
- `/api/health` на момент UAT: sha `2da7f34`, db ok, 10.11.2026 (02:22 за Києвом)

## Доказ на кожен AC зрізу 3

| AC | Вид | Тест (рівень, посилання) | Здатен упасти | Специфікація UAT | Вердикт UAT і кадр | PR і SHA злиття |
|---|---|---|---|---|---|---|
| AC-INS-01 | стан (статус ще не позначено) | unit [`insurance.test.ts#L7`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/scheduling/insurance.test.ts#L7), [`#L25`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/scheduling/insurance.test.ts#L25) (невідоме значення — помилка); база [`insurance.test.ts#L81`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/db/insurance.test.ts#L81); рендер [`insurance-card.test.ts#L43`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/ui/insurance-card.test.ts#L43) | червоний прогін тестів-спершу до коду (таблиці й модуля не було, [#42](https://github.com/markkern-hyra/therapy-scheduling/pull/42)); тест невідомого значення — червоний до ac40dc1 | [`insurance.spec.ts#L53`](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/tests/e2e/insurance.spec.ts#L53) | PASS (R6), [кадр](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/docs/qa/uat/2026-11-10/frames/AC-INS-01-then-1.png) | [#42](https://github.com/markkern-hyra/therapy-scheduling/pull/42), `90bc19f` |
| AC-INS-02 | основний сценарій (планувальник позначає) | дія [`insurance-action.test.ts#L57`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/scheduling/insurance-action.test.ts#L57); база [`#L100`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/db/insurance.test.ts#L100); рендер [`#L36`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/ui/insurance-card.test.ts#L36) | SQL-мутант I7 (`not_set` дозволено в check — «Not set» можна повернути) — KILLED, [#42](https://github.com/markkern-hyra/therapy-scheduling/pull/42) | [`#L86`](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/tests/e2e/insurance.spec.ts#L86) | PASS (R6), [кадр 1](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/docs/qa/uat/2026-11-10/frames/AC-INS-02-then-1.png), [кадр 2](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/docs/qa/uat/2026-11-10/frames/AC-INS-02-then-2.png) | [#43](https://github.com/markkern-hyra/therapy-scheduling/pull/43), `2da7f34` (база — #42) |
| AC-INS-03 | основний сценарій (адміністратор змінює, інший планувальник бачить) | база [`#L108`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/db/insurance.test.ts#L108); дія [`#L71`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/scheduling/insurance-action.test.ts#L71); unit [`#L15`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/scheduling/insurance.test.ts#L15) | — (дозвіл, не відмова; червоний прогін тестів-спершу) | [`#L139`](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/tests/e2e/insurance.spec.ts#L139) | PASS (R6), [кадр 1](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/docs/qa/uat/2026-11-10/frames/AC-INS-03-then-1.png), [кадр 2](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/docs/qa/uat/2026-11-10/frames/AC-INS-03-then-2.png) | [#43](https://github.com/markkern-hyra/therapy-scheduling/pull/43), `2da7f34` |
| AC-INS-04 | відмова в інтерфейсі (терапевт бачить статус свого клієнта, змінити не запропоновано) | рендер [`#L22`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/ui/insurance-card.test.ts#L22), [`#L30`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/ui/insurance-card.test.ts#L30); база [`#L115`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/db/insurance.test.ts#L115) (свій — так, чужий client9 — ні) | SQL-мутант I6 (select без `is_own_client`) — KILLED, [#42](https://github.com/markkern-hyra/therapy-scheduling/pull/42); мутант «форма без `canMark`» — тест рендеру червоний, [#43](https://github.com/markkern-hyra/therapy-scheduling/pull/43) | [`#L252`](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/tests/e2e/insurance.spec.ts#L252) | PASS (R6), [кадр](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/docs/qa/uat/2026-11-10/frames/AC-INS-04-then-1.png) | [#43](https://github.com/markkern-hyra/therapy-scheduling/pull/43), `2da7f34` (база — #42) |
| AC-INS-05 | відмова (заборонена роль, в обхід сторінок) | база [`#L125`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/db/insurance.test.ts#L125), [`#L147`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/db/insurance.test.ts#L147); дія [`#L84`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/scheduling/insurance-action.test.ts#L84) | SQL-мутанти I1, I2 (insert), I3 (update: `using` і `with check`) — KILLED, [#42](https://github.com/markkern-hyra/therapy-scheduling/pull/42); TS-мутант I8 (без перевірки ролі в дії) — KILLED, [#43](https://github.com/markkern-hyra/therapy-scheduling/pull/43) | [`#L285`](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/tests/e2e/insurance.spec.ts#L285) — JWT therapist1 напряму в Data API проду: функція 403, update 0 рядків | PASS (R6), [кадр](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/docs/qa/uat/2026-11-10/frames/AC-INS-05-then-1.png) | [#42](https://github.com/markkern-hyra/therapy-scheduling/pull/42), `90bc19f` (дія — #43) |
| AC-INS-06 | відмова (не увійшов) | база [`#L154`](https://github.com/markkern-hyra/therapy-scheduling/blob/2da7f348b93582ff874610eb8a5e7598cf5f0230/tests/db/insurance.test.ts#L154) (`asAnon`: таблиця, картка, функція) | SQL-мутанти I4 (`execute` для anon), I5 (`select` для anon) — KILLED, [#42](https://github.com/markkern-hyra/therapy-scheduling/pull/42) | [`#L188`](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/tests/e2e/insurance.spec.ts#L188) | PASS (R6), [кадр 1](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/docs/qa/uat/2026-11-10/frames/AC-INS-06-then-1.png), [кадр 2](https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/docs/qa/uat/2026-11-10/frames/AC-INS-06-then-2.png) | [#42](https://github.com/markkern-hyra/therapy-scheduling/pull/42), `90bc19f` |

## Не перевірено

| AC чи частина | Чому не перевірено | Що зроблено замість | Ризик на проді |
|---|---|---|---|
| AC-INS-06 «бачить лише сторінку входу» для інших сторінок застосунку | AC — про картку за прямим посиланням; інші сторінки — AC-CARD-07 зрізу 2 | `requireRole` на кожній сторінці (AC-CARD-07, proof pack WS8) | низький: та сама перевірка входу для всіх сторінок |
| Одночасна позначка двома працівниками | в AC PM немає; правило «останній запис виграє» не задано | `insert … on conflict (client_id) do update` у функції — рядок один на картку | низький: статус — позначка, не гроші; історії PM не планує |
| Stryker на коді зрізу 3 | повний прогін Stryker не запускали; мутанти — вибірково | TS-мутант I8 на перевірку ролі (KILLED) і SQL-мутанти I1–I7 (KILLED) | середній для гілок, яких I8 не стосується (повідомлення, помилки на сторінці); їх тримають тести рендеру |
| Приймання PM | звіт UAT подано 10.11, приймання — до кінця Чт 12.11 | — | — |

## A. Вимоги й спека

- `/requirements-sync` — PR «Оновлення вимог»: https://github.com/markkern-hyra/therapy-scheduling/pull/40 (знімок 2026-11-09)
- Спека `add-insurance-status` і план `impl-insurance-status` — PR «Специфікація»: https://github.com/markkern-hyra/therapy-scheduling/pull/41
- Зміна `clarify-<зріз3>` після уточнень: PM AC не змінював (вимога #33 змінена PM 2026-11-06 до знімка; AC-INS-01…06 без змін)
- Питання PM: питань не було (журнал — `docs/spec-reading.md`)

## B. Реалізація

| PR «Реалізація» | Задача з `tasks.md` | AC | Відповіді на знахідки CodeRabbit | `db-deploy` |
|---|---|---|---|---|
| https://github.com/markkern-hyra/therapy-scheduling/pull/42 | 1.1 Статус у картці й права в базі | AC-INS-01, AC-INS-05, AC-INS-06 | inline «невідомий статус → Not set» — виправлено ac40dc1; 3 pre-merge (шляхи, рядки AC-02…04, `auth.uid()`) — аргументи в коментарі | https://github.com/markkern-hyra/therapy-scheduling/actions/runs/42708818507 («Applying migration 20261109194052_insurance_status.sql») |
| https://github.com/markkern-hyra/therapy-scheduling/pull/43 | 2.1 Позначка статусу | AC-INS-02, AC-INS-03, AC-INS-04 | inline «перевіряти client_id і status у дії, нові повідомлення» — аргумент (база відхиляє, текстів у PM немає); pre-merge (`DESIGN.md`, `scripts/mutants.mjs`) — аргумент | https://github.com/markkern-hyra/therapy-scheduling/actions/runs/42718424573 (міграцій немає) |
| https://github.com/markkern-hyra/therapy-scheduling/pull/44 | 3.1 UAT на кожен AC | AC-INS-01…06 | — (див. PR) | — |

- Специфікація [#41](https://github.com/markkern-hyra/therapy-scheduling/pull/41): CodeRabbit — неточний мутант update в `design.md` (виправлено 7e5673b, тред закрито рецензентом), pre-merge про узагальнення повідомлення — аргумент із джерелами PM.
- Ворота на `main` (`quality`): https://github.com/markkern-hyra/therapy-scheduling/actions/runs/42718424586
- Мутації: SQL I1–I7 — 7/7 KILLED ([#42](https://github.com/markkern-hyra/therapy-scheduling/pull/42), вивід `node scripts/mutation-check.mjs --only I1,…,I7`), TS I8 — KILLED ([#43](https://github.com/markkern-hyra/therapy-scheduling/pull/43)).
- Рев'ю субагентом до PR (`requesting-code-review`): Important «сторінка не показувала `?error=`» і Minor «"Insurance status saved." бачив терапевт» — виправлено в 275f0ea (#43).

## C. UAT на проді

- Звіт: https://github.com/markkern-hyra/therapy-scheduling/blob/ef5ab99/docs/qa/uat/2026-11-10/report.md
- Відео: по одному на AC-INS-01…06 — вкладеннями в описі https://github.com/markkern-hyra/therapy-scheduling/pull/44. Їх завантажує людина у вебінтерфейсі після злиття цього файлу, бо `gh` вкладень не вантажить. До того запис кожного AC — кадри «Тоді» й `manifest.json` у звіті.
- Рецензент: `claude-haiku-5-5` (суперечки → `claude-sonnet-5-5`, суперечок не було), $0.0161 за розбір 6 AC
- Негативний контроль: NC-1 (`npm run uat:nc`, той самий прод `2da7f34`) — навмисно інший текст у твердженні AC-CARD-06 → **FAIL, R1**; NC-2 → NEEDS-HUMAN, R3; рядки звіту — в описі [#44](https://github.com/markkern-hyra/therapy-scheduling/pull/44)
- Дані: `@writes` — синтетичні картки `uat-<запуск>-…@example.test` на кожен AC; «Прибирання» зі звіту: видалено 6 (картки всіх AC), лишилось 0, їхніх рядків — 0

### Приймання PM

| AC | Рішення PM | Посилання |
|---|---|---|
| AC-INS-01…06 | очікує (звіт UAT подано 10.11.2026) | — |

## D. Прод і ретро

- `/api/health` після злиття всіх задач: sha `2da7f34`, db ok (10.11.2026); після злиття #44 — sha злиття #44
- Нові ролі й акаунти: нових ролей у зрізі 3 немає; `accounts.zip` без змін
- `docs/conformance.md`: рядки AC-INS-01…06 — «реалізовано», з кодом, unit/база/рендер і e2e
- Ретро: [`docs/qa/retro-ws9.md`](retro-ws9.md); порівняння з фабрикою — [`docs/qa/factory-comparison.md`](factory-comparison.md)

### Ретро: що б ми взяли з фабрики у свій звичайний процес

Окремим файлом — [`docs/qa/retro-ws9.md`](retro-ws9.md) (10 рядків, кожен «візьмемо» — з файлом).
