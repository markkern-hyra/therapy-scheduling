# Матриця відповідності (AC → код → тест → статус)

<!--
Ваша матриця: один рядок на кожен AC з openspec/specs/** — вашої специфікації, у яку ви перекладаєте вимоги PM
(їхній знімок у requirements/ приносить команда агента /requirements-sync).
Рядок «Вимоги» під цим коментарем заповнює лише /requirements-sync: адреса репо вимог PM, звідки взято вимоги (issues
або файли docs/), і дата знімка, через « · ». Руками його не змінюйте: з нього /requirements-sync знає, звідки брати
вимоги наступного разу, а скіли spec-clarify, spec-review і /conformance — куди ставити питання й яку версію вимог ви
реалізуєте. Рядків таблиці /requirements-sync не додає.
Рядки змінюєте ви:
  PR «Специфікація» — після archive зміни: рядок кожного нового AC зі статусом «відкладено (чекає реалізації)»; рядки AC,
                      прибраних зі специфікації (REMOVED), — видалити;
  PR «Реалізація»   — рядок AC задачі в тому самому PR, що й код і тест.
Перебудувати автоматично: /conformance (Claude Code, Cursor).
Перевірка в CI: npm run ac:coverage — падає, якщо
  NO-ROW     AC є в специфікації, а рядка немає (типово — PR «Специфікація» без нових рядків або рядок видалено);
  MISSING    статус «реалізовано», а непропущеного тесту, назва якого починається з цього AC ID, у файлах
             *.test.ts / *.test.tsx немає (*.spec.ts і допоміжні файли Vitest не запускає — вони не рахуються);
  ORPHAN     тест посилається на AC, якого немає в специфікації (AC прибрано або вимогу PM ще не перекладено);
  BAD-STATUS статус не «реалізовано» і не «відкладено (причина)»;
  WRONG-REF  шляху `src/…`/`tests/…`/`supabase/…` з колонок «Код»/«Тест» немає або тест із цим AC в іншому файлі;
і попереджає, не падаючи: AC з вимог PM (requirements/), якого ще немає в openspec/specs/, — «вимогу PM ще не перекладено
в специфікацію».

Приклад рядків (усередині коментаря — скрипт їх не читає):
| AC-LEAVE-02 | заявка на дві посади дає два записи main і additional | `src/app/requests/actions.ts` (createRequest) | `tests/requests.test.ts` | реалізовано |
| AC-LEAVE-04 | заблоковані дні не рахуються | — | — | відкладено (чекаю відповідь PM на Q2, <pm>/<team-slug>-spec#5) |
| AC-LEAVE-07 | менеджер бачить лише свій відділ | — | — | відкладено (рішення PM: поза зрізом 1, <pm>/<team-slug>-spec#8) |
| AC-LEAVE-10 | діапазон лише із заблокованих днів | — | — | відкладено (чекає реалізації) |
-->

Вимоги: https://github.com/Sofiia-pm/therapy-scheduling-spec · джерело: issues · знімок 2026-10-26

| AC | Що перевіряє | Код | Тест | Статус |
|---|---|---|---|---|
| AC-HOLD-10 | новий клієнт з ім'ям та email створюється й доступний для утримання | `src/app/clients/actions.ts` (createClientCard), `src/lib/scheduling/clients.ts`, `src/lib/scheduling/messages.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` | `tests/scheduling/clients.test.ts` | відкладено (вибір клієнта під час утримання — задача 3.1) |
| AC-HOLD-11 | порожнє ім'я — клієнта не створено, «Enter the client's name and a valid email.» | `src/app/clients/actions.ts` (createClientCard), `src/lib/scheduling/clients.ts`, `src/lib/scheduling/messages.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` | `tests/scheduling/clients.test.ts`, `tests/db/clients.test.ts` | реалізовано |
| AC-HOLD-15 | email без @ — клієнта не створено, «Enter the client's name and a valid email.» | `src/app/clients/actions.ts` (createClientCard), `src/lib/scheduling/clients.ts`, `src/lib/scheduling/messages.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` | `tests/scheduling/clients.test.ts`, `tests/db/clients.test.ts` | реалізовано |
| AC-HOLD-16 | той самий email — «A client with this email already exists.» | `src/app/clients/actions.ts` (createClientCard), `src/lib/scheduling/clients.ts`, `src/lib/scheduling/messages.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` | `tests/scheduling/clients.test.ts`, `tests/db/clients.test.ts` | реалізовано |
| AC-HOLD-34 | той самий email іншим регістром і з пробілами — дублікат | `src/app/clients/actions.ts` (createClientCard), `src/lib/scheduling/clients.ts`, `src/lib/scheduling/messages.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` | `tests/scheduling/clients.test.ts`, `tests/db/clients.test.ts` | реалізовано |
| AC-HOLD-35 | email зберігається й показується малими літерами без пробілів | `src/app/clients/actions.ts` (createClientCard), `src/lib/scheduling/clients.ts`, `src/lib/scheduling/messages.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` | `tests/scheduling/clients.test.ts` | відкладено (показ email під час утримання — задача 3.1) |
| AC-HOLD-39 | інші некоректні email (без крапки після «@», два «@», порожня частина до «@», пробіл) — «Enter the client's name and a valid email.» | `src/app/clients/actions.ts` (createClientCard), `src/lib/scheduling/clients.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` | `tests/db/clients.test.ts` | реалізовано |
| AC-HOLD-41 | ім'я з пробілів — не створено; « Client Four » збережено як «Client Four» | `src/app/clients/actions.ts` (createClientCard), `src/lib/scheduling/clients.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` | `tests/db/clients.test.ts` | реалізовано |
| AC-HOLD-01 | слоти дня зі статусами вільний / «Held» / «Confirmed»; утримати можна лише вільний | — | — | відкладено (чекає реалізації) |
| AC-HOLD-32 | слоти, що вже почалися без активного утримання, — «Past», не утримуються | — | — | відкладено (чекає реалізації) |
| AC-HOLD-18 | день без вільних слотів — «No free slots on this day.» і всі слоти зі статусами | — | — | відкладено (чекає реалізації) |
| AC-HOLD-24 | день без жодного слоту — лише «No free slots on this day.» | `src/lib/scheduling/status.ts` (daySlotsView), `src/app/slots/page.tsx` | `tests/scheduling/status.test.ts` | реалізовано |
| AC-HOLD-33 | слоти «Past» не рахуються вільними для «No free slots on this day.» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-02 | утримання — статус «Held», клієнт і «Held until» +24 години | — | — | відкладено (чекає реалізації) |
| AC-HOLD-03 | слот уже утримано — «This slot is no longer available.» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-04 | одночасне утримання двома планувальниками — рівно одне утримання | — | — | відкладено (чекає реалізації) |
| AC-HOLD-17 | повторне утримання за тим самим клієнтом не змінює «Held until» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-07 | слот, що вже почався, — «This slot has already started and cannot be held.» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-08 | терапевт не утримує — «Only schedulers and admins can hold slots.» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-25 | перетин з утриманням клієнта — «This client already has a hold or session at this time.» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-26 | прострочене утримання клієнта не заважає новому | — | — | відкладено (чекає реалізації) |
| AC-HOLD-05 | за хвилину до 24 годин утримання ще «Held» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-06 | через 24 години — «Expired», слот вільний | — | — | відкладено (чекає реалізації) |
| AC-HOLD-20 | планувальник бачить прострочене утримання зі статусом «Expired» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-28 | прострочене утримання видно до початку слоту | — | — | відкладено (чекає реалізації) |
| AC-HOLD-29 | з початку слоту прострочене утримання в списку не показано | — | — | відкладено (чекає реалізації) |
| AC-HOLD-37 | прострочене утримання знову утримано за тим самим клієнтом — «Held» до 2026-11-04 15:00, старий «Expired» зник зі списку | — | — | відкладено (чекає реалізації) |
| AC-HOLD-38 | список утримань — лише «Held» і «Expired», за часом слоту від найближчого | — | — | відкладено (чекає реалізації) |
| AC-HOLD-42 | утримання «Held» зникає зі списку з початком слоту | — | — | відкладено (чекає реалізації) |
| AC-HOLD-12 | підтвердження — «Confirmed», без «Held until», слот недоступний і після 24 годин | — | — | відкладено (чекає реалізації) |
| AC-HOLD-19 | адміністратор утримує й підтверджує, як планувальник | — | — | відкладено (чекає реалізації) |
| AC-HOLD-23 | підтвердження за хвилину до початку слоту | — | — | відкладено (чекає реалізації) |
| AC-HOLD-27 | інший планувальник підтверджує чуже утримання | — | — | відкладено (чекає реалізації) |
| AC-HOLD-13 | прострочене утримання — «This hold has expired. Hold the slot again.» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-22 | після початку слоту — «This slot has already started and cannot be confirmed.» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-36 | друге підтвердження — «This hold is already confirmed.» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-14 | терапевт не підтверджує — «Only schedulers and admins can confirm holds.» | — | — | відкладено (чекає реалізації) |
| AC-HOLD-30 | розклад терапевта — поточний тиждень пн–нд зі статусами слотів | — | — | відкладено (чекає реалізації) |
| AC-HOLD-31 | перемикання розкладу на наступний тиждень | — | — | відкладено (чекає реалізації) |
| AC-HOLD-09 | терапевт бачить лише власний розклад | — | `tests/db/slots.test.ts` | відкладено (чекає реалізації) |
| AC-HOLD-21 | прострочене утримання не показано в розкладі терапевта | — | — | відкладено (чекає реалізації) |
| AC-HOLD-40 | у розкладі терапевта — ім'я клієнта без email | — | — | відкладено (чекає реалізації) |
| AC-CARD-01 | картка дорослого з анкети (тип, ім'я, email, дата народження, мова) — створено, можна вибрати під час утримання | — | — | відкладено (чекає реалізації) |
| AC-CARD-02 | картка дитини з опікуном — створено, під час утримання біля дитини email опікуна | — | — | відкладено (чекає реалізації) |
| AC-CARD-03 | порожнє ім'я чи email опікуна — «Enter the guardian's name and a valid email.», введене лишається у формі | — | — | відкладено (чекає реалізації) |
| AC-CARD-04 | терапевт бачить картки лише своїх клієнтів («Held» чи «Confirmed» у нього), з даними анкети й опікуна | — | — | відкладено (чекає реалізації) |
| AC-CARD-05 | терапевт за прямим посиланням на картку чужого клієнта — «You don't have access to this client.», даних немає, картка не змінилась | — | — | відкладено (чекає реалізації) |
| AC-CARD-06 | терапевт пробує створити картку — «Only schedulers and admins can create client cards.», кількість карток не змінилась | — | — | відкладено (чекає реалізації) |
| AC-CARD-07 | без входу список клієнтів, картка чи список утримань — лише сторінка входу, картки не змінились | — | — | відкладено (чекає реалізації) |
| AC-CARD-08 | утримання прострочилось — клієнта немає в списку терапевта, картка — «You don't have access to this client.» | — | — | відкладено (чекає реалізації) |
| AC-CARD-09 | терапевт без своїх клієнтів — «No clients yet. Clients appear here when a scheduler holds a slot with you.» | — | — | відкладено (чекає реалізації) |
| AC-CARD-10 | планувальник і адміністратор бачать усі картки, у картці дитини — дані опікуна | — | — | відкладено (чекає реалізації) |
| AC-CARD-11 | користувач без ролі — лише «Your account has no access yet. Contact an administrator.», картки не змінились | — | — | відкладено (чекає реалізації) |
