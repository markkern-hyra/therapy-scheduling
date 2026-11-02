## MODIFIED Requirements

### Requirement: Картка дитини з опікуном

WHEN планувальник або адміністратор створює картку з типом «Child», ім'ям дитини, датою народження, мовою сеансів, ім'ям та email опікуна, the system SHALL створити картку з даними дитини й опікуна, а під час утримання слоту дозволити знайти дитину за email опікуна й показувати біля неї email опікуна.

#### Scenario: AC-CARD-02 Картка дитини з опікуном

- **GIVEN** опікуна з email guardian7@example.test ще не вказано в жодній картці
- **WHEN** scheduler1 створює картку з типом «Child», ім'ям «Client Seven», датою народження 2015-03-02, мовою сеансів «Spanish», ім'ям опікуна «Guardian Seven» і email опікуна guardian7@example.test
- **THEN** картку створено, у ній показано дані дитини й опікуна
- **AND** під час утримання слоту client7 можна знайти за email опікуна guardian7@example.test, і біля client7 показано email опікуна

### Requirement: Терапевт бачить картки лише своїх клієнтів

WHEN терапевт відкриває список своїх клієнтів, the system SHALL показати картки лише тих клієнтів, у яких з ним є утримання зі статусом «Held», слот якого ще не почався, або сеанс зі статусом «Confirmed» (зокрема минулий), з усіма даними анкети (для дитини — з даними опікуна), а якщо таких клієнтів немає — повідомлення «No clients yet. Clients appear here when a scheduler holds a slot with you.» і жодної картки.

#### Scenario: AC-CARD-04 Список своїх клієнтів

- **GIVEN** зараз 2026-11-02 12:00, client6 має утримання зі статусом «Held» у therapist1 на 2026-11-05 о 10:00, client7 — сеанс зі статусом «Confirmed» у therapist1 2026-11-04 о 10:00, а client9 — утримання зі статусом «Held» у therapist2 на 2026-11-05 об 11:00
- **WHEN** therapist1 відкриває список своїх клієнтів
- **THEN** він бачить картки client6 і client7 з усіма даними анкети (для client7 — з даними опікуна)
- **AND** не бачить client9

#### Scenario: AC-CARD-09 Своїх клієнтів ще немає

- **GIVEN** therapist2 не має жодного утримання зі статусом «Held» і жодного сеансу зі статусом «Confirmed»
- **WHEN** therapist2 відкриває список своїх клієнтів
- **THEN** він бачить повідомлення «No clients yet. Clients appear here when a scheduler holds a slot with you.»
- **AND** не бачить жодної картки

#### Scenario: AC-CARD-14 Клієнт перестає бути своїм з початком слоту утримання

- **GIVEN** слот therapist1 2026-11-03 о 10:00 утримано за client6 2026-11-02 о 14:30 зі статусом «Held», client7 мав сеанс зі статусом «Confirmed» у therapist1 2026-11-02 о 10:00, і інших утримань чи сеансів client6 і client7 з therapist1 немає
- **WHEN** therapist1 відкриває список своїх клієнтів 2026-11-03 о 09:59, а потім о 10:00 або пізніше
- **THEN** о 09:59 він бачить картки client6 і client7, а з 10:00 — лише картку client7
- **AND** за прямим посиланням на картку client6 therapist1 бачить повідомлення «You don't have access to this client.» і жодних даних client6

### Requirement: Чужа картка недоступна терапевту

IF терапевт відкриває картку клієнта, у якого з ним немає утримання зі статусом «Held», слот якого ще не почався, чи сеансу зі статусом «Confirmed», зокрема за прямим посиланням, THEN the system SHALL показати повідомлення «You don't have access to this client.», не показувати жодних даних цього клієнта й не змінювати його картку.

#### Scenario: AC-CARD-05 Картка клієнта іншого терапевта

- **GIVEN** client9 — свій клієнт лише для therapist2
- **WHEN** therapist1 відкриває картку client9 за прямим посиланням
- **THEN** therapist1 бачить повідомлення «You don't have access to this client.», жодних даних client9 не показано
- **AND** картка client9 не змінилася

#### Scenario: AC-CARD-08 Утримання прострочилось — клієнт більше не свій

- **GIVEN** утримання client6 у therapist1 має статус «Expired», і інших утримань чи сеансів client6 з therapist1 немає
- **WHEN** therapist1 відкриває список своїх клієнтів, а потім картку client6 за прямим посиланням
- **THEN** client6 у списку немає
- **AND** за посиланням therapist1 бачить повідомлення «You don't have access to this client.» і жодних даних client6

### Requirement: Картки створюють лише планувальник і адміністратор

IF терапевт відкриває форму нової картки клієнта за прямим посиланням або пробує створити картку в обхід цієї сторінки, THEN the system SHALL не показувати форму й не створювати картку, одразу показати повідомлення «Only schedulers and admins can create client cards.» і не змінювати кількість карток клієнтів.

#### Scenario: AC-CARD-06 Терапевт пробує створити картку

- **GIVEN** therapist1 увійшов у застосунок
- **WHEN** він відкриває форму нової картки клієнта за прямим посиланням
- **THEN** форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.»
- **AND** кількість карток клієнтів не змінилася

## ADDED Requirements

### Requirement: Помилки у формі картки показуються одразу всі

IF у формі картки клієнта тип не вибрано, ім'я порожнє, дата народження порожня або пізніша за сьогодні, мову сеансів не вибрано, THEN the system SHALL не створювати картку, лишити всі введені дані у формі й показати одразу всі повідомлення, кожне біля свого поля: «Select a client type.», для дорослого — «Enter the client's name and a valid email.», для дитини — «Enter the client's name.», «Enter a date of birth that is not in the future.», «Select a session language.».

#### Scenario: AC-CARD-12 Кілька помилок у формі дитини

- **GIVEN** сьогодні 2026-11-03
- **WHEN** scheduler1 створює картку з типом «Child», порожнім ім'ям, датою народження 2026-11-04, без мови сеансів, з ім'ям опікуна «Guardian Eight» і email опікуна guardian8@example.test
- **THEN** картку не створено, scheduler1 одразу бачить три повідомлення біля відповідних полів — «Enter the client's name.», «Enter a date of birth that is not in the future.» і «Select a session language.»
- **AND** усі введені дані лишаються у формі

### Requirement: Дублікат картки дитини

IF уже є картка дитини з тим самим ім'ям (без урахування великих і малих літер та пробілів на початку й у кінці), датою народження й email опікуна, THEN the system SHALL не створювати другу картку, показати повідомлення «A client with these details already exists.» і лишити введені дані у формі.

#### Scenario: AC-CARD-13 Друга картка тієї самої дитини

- **GIVEN** є картка client7 з типом «Child», ім'ям «Client Seven», датою народження 2015-03-02 і email опікуна guardian7@example.test
- **WHEN** scheduler2 створює картку з типом «Child», ім'ям « client seven », датою народження 2015-03-02, мовою сеансів «English», ім'ям опікуна «Guardian Seven» і email опікуна guardian7@example.test
- **THEN** другу картку не створено, scheduler2 бачить повідомлення «A client with these details already exists.»
- **AND** введені дані лишаються у формі

### Requirement: Порожній список клієнтів для планувальника й адміністратора

IF у практиці ще немає жодної картки клієнта, THEN the system SHALL показати планувальнику й адміністратору замість списку повідомлення «No clients yet. Create a client card from an intake form.» і лишити форму нової картки доступною.

#### Scenario: AC-CARD-15 Карток ще немає

- **GIVEN** у практиці ще немає жодної картки клієнта
- **WHEN** scheduler1 або admin1 відкриває список клієнтів
- **THEN** замість списку він бачить повідомлення «No clients yet. Create a client card from an intake form.»
- **AND** форма нової картки доступна, як завжди

### Requirement: Посилання на картку, якої немає

IF картки клієнта, на яку веде посилання, не існує, THEN the system SHALL показати планувальнику й адміністратору повідомлення «This client card doesn't exist.», а терапевту — «You don't have access to this client.», і не показувати жодних даних клієнтів.

#### Scenario: AC-CARD-16 Неіснуюча картка

- **GIVEN** картки клієнта, на яку веде посилання, не існує
- **WHEN** scheduler1, а потім therapist1 відкриває це посилання
- **THEN** scheduler1 бачить повідомлення «This client card doesn't exist.», therapist1 — «You don't have access to this client.»
- **AND** жоден із них не бачить жодних даних клієнтів
