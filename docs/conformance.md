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
| AC-HOLD-10 | новий клієнт з ім'ям та email створюється й доступний для утримання (з анкетою зрізу 2 — ще дата народження й мова, AC-CARD-01; тимчасово, до відповіді PM на Sofiia-pm/therapy-scheduling-spec#20) | `src/app/clients/actions.ts` (createClientCard), `src/app/slots/page.tsx` (вибір клієнта), `src/app/slots/actions.ts` (holdSlot) | `tests/db/holds.test.ts`, `tests/scheduling/clients.test.ts` | реалізовано |
| AC-HOLD-11 | порожнє ім'я — клієнта не створено, «Enter the client's name and a valid email.» | `src/app/clients/actions.ts` (createClientCard), `src/lib/scheduling/clients.ts`, `src/lib/scheduling/messages.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` | `tests/scheduling/clients.test.ts`, `tests/db/clients.test.ts` | реалізовано |
| AC-HOLD-15 | email без @ — клієнта не створено, «Enter the client's name and a valid email.» | `src/app/clients/actions.ts` (createClientCard), `src/lib/scheduling/clients.ts`, `src/lib/scheduling/messages.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` | `tests/scheduling/clients.test.ts`, `tests/db/clients.test.ts` | реалізовано |
| AC-HOLD-16 | той самий email — «A client with this email already exists.» | `src/app/clients/actions.ts` (createClientCard), `src/lib/scheduling/clients.ts`, `src/lib/scheduling/messages.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` | `tests/scheduling/clients.test.ts`, `tests/db/clients.test.ts` | реалізовано |
| AC-HOLD-34 | той самий email іншим регістром і з пробілами — дублікат | `src/app/clients/actions.ts` (createClientCard), `src/lib/scheduling/clients.ts`, `src/lib/scheduling/messages.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` | `tests/scheduling/clients.test.ts`, `tests/db/clients.test.ts` | реалізовано |
| AC-HOLD-35 | email зберігається й показується малими літерами без пробілів | `src/lib/scheduling/clients.ts` (cardFromForm), `src/app/slots/page.tsx` (вибір клієнта з email) | `tests/scheduling/clients.test.ts` | реалізовано |
| AC-HOLD-39 | інші некоректні email (без крапки після «@», два «@», порожня частина до «@», пробіл) — «Enter the client's name and a valid email.» | `src/app/clients/actions.ts` (createClientCard), `src/lib/scheduling/clients.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` | `tests/db/clients.test.ts` | реалізовано |
| AC-HOLD-41 | ім'я з пробілів — не створено; « Client Four » збережено як «Client Four» | `src/app/clients/actions.ts` (createClientCard), `src/lib/scheduling/clients.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` | `tests/db/clients.test.ts` | реалізовано |
| AC-HOLD-01 | слоти дня зі статусами вільний / «Held» / «Confirmed»; утримати можна лише вільний | `src/lib/scheduling/status.ts` (daySlotsView), `src/app/slots/page.tsx` | `tests/scheduling/status.test.ts` | реалізовано |
| AC-HOLD-32 | слоти, що вже почалися без активного утримання, — «Past», не утримуються | `src/lib/scheduling/status.ts` (slotStatus), `src/app/slots/page.tsx` | `tests/scheduling/status.test.ts` | реалізовано |
| AC-HOLD-18 | день без вільних слотів — «No free slots on this day.» і всі слоти зі статусами | `src/lib/scheduling/status.ts` (daySlotsView), `src/app/slots/page.tsx` | `tests/scheduling/status.test.ts` | реалізовано |
| AC-HOLD-24 | день без жодного слоту — лише «No free slots on this day.» | `src/lib/scheduling/status.ts` (daySlotsView), `src/app/slots/page.tsx` | `tests/scheduling/status.test.ts` | реалізовано |
| AC-HOLD-33 | слоти «Past» не рахуються вільними для «No free slots on this day.» | `src/lib/scheduling/status.ts` (daySlotsView), `src/app/slots/page.tsx` | `tests/scheduling/status.test.ts` | реалізовано |
| AC-HOLD-02 | утримання — статус «Held», клієнт і «Held until» +24 години | `supabase/migrations/20261026103449_holds.sql` (check_new_hold), `src/lib/scheduling/status.ts` (holdStatus), `src/app/slots/page.tsx` | `tests/db/holds.test.ts`, `tests/scheduling/status.test.ts` | реалізовано |
| AC-HOLD-03 | слот уже утримано — «This slot is no longer available.» | `supabase/migrations/20261026103449_holds.sql` (check_new_hold), `src/app/slots/actions.ts` (holdSlot), `src/lib/scheduling/messages.ts` | `tests/db/holds.test.ts`, `tests/scheduling/messages.test.ts` | реалізовано |
| AC-HOLD-04 | одночасне утримання двома планувальниками — рівно одне утримання | `supabase/migrations/20261026103449_holds.sql` (check_new_hold), `src/app/slots/actions.ts` (holdSlot) | `tests/db/holds.test.ts` | реалізовано |
| AC-HOLD-17 | повторне утримання за тим самим клієнтом не змінює «Held until» | `supabase/migrations/20261026103449_holds.sql` (check_new_hold), `src/app/slots/actions.ts` (holdSlot) | `tests/db/holds.test.ts` | реалізовано |
| AC-HOLD-07 | слот, що вже почався, — «This slot has already started and cannot be held.» | `supabase/migrations/20261026103449_holds.sql` (check_new_hold), `src/app/slots/actions.ts` (holdSlot), `src/lib/scheduling/messages.ts` | `tests/db/holds.test.ts`, `tests/scheduling/messages.test.ts` | реалізовано |
| AC-HOLD-08 | терапевт не утримує — «Only schedulers and admins can hold slots.» | `supabase/migrations/20261026103449_holds.sql` (check_new_hold), `src/app/slots/actions.ts` (holdSlot), `src/lib/scheduling/messages.ts`, `src/app/page.tsx` | `tests/db/holds.test.ts`, `tests/scheduling/messages.test.ts` | реалізовано |
| AC-HOLD-25 | перетин з утриманням клієнта — «This client already has a hold or session at this time.» | `supabase/migrations/20261026103449_holds.sql` (check_new_hold), `src/app/slots/actions.ts` (holdSlot), `src/lib/scheduling/messages.ts` | `tests/db/holds.test.ts`, `tests/scheduling/messages.test.ts` | реалізовано |
| AC-HOLD-26 | прострочене утримання клієнта не заважає новому | `supabase/migrations/20261026103449_holds.sql` (check_new_hold), `src/app/slots/actions.ts` (holdSlot) | `tests/db/holds.test.ts` | реалізовано |
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
| AC-CARD-01 | картка дорослого з анкети (тип, ім'я, email, дата народження, мова) — створено, можна вибрати під час утримання | `supabase/migrations/20261026104702_client_cards.sql`, `src/app/clients/actions.ts` (createClientCard), `src/app/_components/client-card-form.tsx`, `src/lib/scheduling/clients.ts` (cardFromForm, cardFields), `src/app/clients/[id]/page.tsx`, `src/app/slots/page.tsx` (вибір клієнта) | `tests/db/client-cards.test.ts`, `tests/scheduling/clients.test.ts`, `tests/scheduling/client-card-action.test.ts` | реалізовано |
| AC-CARD-02 | картка дитини з опікуном — створено, під час утримання біля дитини email опікуна | `supabase/migrations/20261026104702_client_cards.sql` (clients_contact_check), `src/lib/scheduling/clients.ts` (cardFromForm, cardFields, contactEmail), `src/app/clients/[id]/page.tsx`, `src/app/slots/page.tsx` (email опікуна у виборі) | `tests/db/client-cards.test.ts`, `tests/scheduling/clients.test.ts` | реалізовано |
| AC-CARD-03 | порожнє ім'я чи email опікуна — «Enter the guardian's name and a valid email.», введене лишається у формі | `supabase/migrations/20261026104702_client_cards.sql` (clients_guardian_check), `src/app/_components/client-card-form.tsx` (useActionState), `src/app/clients/actions.ts` (cardValues), `src/lib/scheduling/messages.ts` | `tests/db/client-cards.test.ts`, `tests/scheduling/clients.test.ts`, `tests/scheduling/client-card-action.test.ts` | реалізовано |
| AC-CARD-04 | терапевт бачить картки лише своїх клієнтів («Held» чи «Confirmed» у нього), з даними анкети й опікуна | `supabase/migrations/20261026110054_own_clients.sql` (is_own_client, clients_select_own_for_therapist), `src/app/clients/page.tsx`, `src/app/clients/[id]/page.tsx` | `tests/db/own-clients.test.ts` | реалізовано |
| AC-CARD-05 | терапевт за прямим посиланням на картку чужого клієнта — «You don't have access to this client.», даних немає, картка не змінилась | `supabase/migrations/20261026110054_own_clients.sql` (is_own_client, clients_select_own_for_therapist), `src/app/clients/[id]/page.tsx` | `tests/db/own-clients.test.ts` | реалізовано |
| AC-CARD-06 | терапевт пробує створити картку — «Only schedulers and admins can create client cards.», кількість карток не змінилась | `src/app/clients/actions.ts` (canCreateCards до запису), `src/app/clients/new/page.tsx`, `src/lib/scheduling/clients.ts`, `supabase/migrations/20261021155328_roles_and_clients.sql` (clients_insert_staff) | `tests/db/client-cards.test.ts`, `tests/scheduling/clients.test.ts`, `tests/scheduling/client-card-action.test.ts` | реалізовано |
| AC-CARD-07 | без входу список клієнтів, картка чи список утримань — лише сторінка входу, картки не змінились | `src/proxy.ts`, `src/lib/auth/require-role.ts`, `src/lib/auth/access.ts` | `tests/auth/access.test.ts`, `tests/db/client-cards.test.ts` | реалізовано |
| AC-CARD-08 | утримання прострочилось — клієнта немає в списку терапевта, картка — «You don't have access to this client.» | `supabase/migrations/20261026110054_own_clients.sql` (is_own_client, clients_select_own_for_therapist), `src/app/clients/page.tsx`, `src/app/clients/[id]/page.tsx` | `tests/db/own-clients.test.ts` | реалізовано |
| AC-CARD-09 | терапевт без своїх клієнтів — «No clients yet. Clients appear here when a scheduler holds a slot with you.» | `supabase/migrations/20261026110054_own_clients.sql` (is_own_client, clients_select_own_for_therapist), `src/app/clients/page.tsx`, `src/lib/scheduling/clients.ts` (emptyClientsText) | `tests/db/own-clients.test.ts`, `tests/scheduling/clients.test.ts` | реалізовано |
| AC-CARD-10 | планувальник і адміністратор бачать усі картки, у картці дитини — дані опікуна | `src/app/clients/page.tsx`, `src/app/clients/[id]/page.tsx`, `supabase/migrations/20261021155328_roles_and_clients.sql` (clients_select_staff) | `tests/db/client-cards.test.ts` | реалізовано |
| AC-CARD-11 | користувач без ролі — лише «Your account has no access yet. Contact an administrator.», картки не змінились | `supabase/migrations/20261026104702_client_cards.sql` (profiles.role без ролі), `src/lib/auth/access.ts`, `src/lib/auth/require-role.ts`, `src/app/no-access/page.tsx` | `tests/auth/access.test.ts`, `tests/db/client-cards.test.ts` | реалізовано |
