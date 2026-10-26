# clients Specification

## Purpose
Картка клієнта, за яким утримують слоти: у зрізі 1 — лише ім'я та email, які планувальник або адміністратор вводить під
час створення клієнта.

## Requirements

### Requirement: Створення картки клієнта

WHEN планувальник або адміністратор створює клієнта з непорожнім ім'ям і коректним email, якого ще немає, the system SHALL створити картку клієнта, яку можна вибрати під час утримання слоту.

#### Scenario: AC-HOLD-10 Новий клієнт

- **GIVEN** клієнта з email client3@example.test ще немає
- **WHEN** планувальник створює клієнта з іменем «Client Three» і email client3@example.test
- **THEN** картку клієнта створено
- **AND** його можна вибрати під час утримання слоту

### Requirement: Ім'я та email обов'язкові

IF під час створення клієнта ім'я порожнє або email некоректний — після прибирання пробілів на початку й у кінці не містить рівно одного «@», має порожню частину до чи після нього, не має крапки в частині після «@» або має пробіл усередині, THEN the system SHALL не створювати клієнта й показати повідомлення «Enter the client's name and a valid email.»

#### Scenario: AC-HOLD-11 Порожнє ім'я

- **GIVEN** планувальник створює клієнта
- **WHEN** ім'я залишено порожнім, а email — client3@example.test
- **THEN** клієнта не створено
- **AND** планувальник бачить повідомлення «Enter the client's name and a valid email.»

#### Scenario: AC-HOLD-15 Email без знака @

- **GIVEN** планувальник створює клієнта
- **WHEN** ім'я — «Client Three», а email — «client3example.test» (без знака @)
- **THEN** клієнта не створено
- **AND** планувальник бачить повідомлення «Enter the client's name and a valid email.»

#### Scenario: AC-HOLD-39 Інші некоректні email

- **GIVEN** клієнта з таким email ще немає
- **WHEN** планувальник створює клієнта «Client Three» з email «client3@example» (без крапки після «@»), «client3@@example.test» (два «@»), «@example.test» (порожня частина до «@») або «client 3@example.test» (пробіл усередині)
- **THEN** у кожному випадку клієнта не створено
- **AND** планувальник бачить повідомлення «Enter the client's name and a valid email.»

### Requirement: Унікальний email клієнта

IF клієнт з email, що відрізняється від введеного лише великими й малими літерами або пробілами на початку й у кінці, уже існує, THEN the system SHALL не створювати клієнта й показати повідомлення «A client with this email already exists.»

#### Scenario: AC-HOLD-16 Той самий email

- **GIVEN** клієнт з email client1@example.test уже існує
- **WHEN** планувальник створює ще одного клієнта з email client1@example.test
- **THEN** клієнта не створено
- **AND** планувальник бачить повідомлення «A client with this email already exists.»

#### Scenario: AC-HOLD-34 Той самий email іншим регістром і з пробілами

- **GIVEN** клієнт з email client1@example.test уже існує
- **WHEN** планувальник створює клієнта «Client One» з email « Client1@Example.TEST » (з великими літерами й пробілами на початку та в кінці)
- **THEN** клієнта не створено
- **AND** планувальник бачить повідомлення «A client with this email already exists.»

### Requirement: Email зберігається в єдиному вигляді

WHEN планувальник або адміністратор створює клієнта, the system SHALL зберігати й показувати його email малими літерами без пробілів на початку й у кінці.

#### Scenario: AC-HOLD-35 Email з великими літерами й пробілами

- **GIVEN** клієнта з email client3@example.test ще немає
- **WHEN** планувальник створює клієнта «Client Three» з email « Client3@Example.TEST »
- **THEN** клієнта створено
- **AND** у картці клієнта та під час утримання його email показано як client3@example.test

### Requirement: Ім'я без пробілів по краях

WHEN планувальник або адміністратор створює клієнта, the system SHALL зберігати й показувати ім'я клієнта без пробілів на початку й у кінці, а ім'я лише з пробілів вважати порожнім.

#### Scenario: AC-HOLD-41 Ім'я з пробілів і ім'я з пробілами по краях

- **GIVEN** клієнтів з email client4@example.test і client5@example.test ще немає
- **WHEN** планувальник створює клієнта з іменем «   » (лише пробіли) і email client5@example.test, а потім клієнта з іменем « Client Four » і email client4@example.test
- **THEN** першого клієнта не створено, і планувальник бачить повідомлення «Enter the client's name and a valid email.»
- **AND** другого створено, і в картці його ім'я показано як «Client Four»

### Requirement: Картка дорослого клієнта з анкети

WHEN планувальник або адміністратор створює картку з типом «Adult», ім'ям, email, датою народження й мовою сеансів, the system SHALL створити картку з усіма цими даними, яку можна вибрати під час утримання слоту.

#### Scenario: AC-CARD-01 Картка дорослого

- **GIVEN** клієнта з email client6@example.test ще немає
- **WHEN** scheduler1 створює картку з типом «Adult», ім'ям «Client Six», email client6@example.test, датою народження 1990-05-14 і мовою сеансів «English»
- **THEN** картку створено, у ній показано всі ці дані
- **AND** client6 можна вибрати під час утримання слоту

### Requirement: Картка дитини з опікуном

WHEN планувальник або адміністратор створює картку з типом «Child», ім'ям дитини, датою народження, мовою сеансів, ім'ям та email опікуна, the system SHALL створити картку з даними дитини й опікуна і під час утримання слоту показувати біля клієнта email опікуна.

#### Scenario: AC-CARD-02 Картка дитини з опікуном

- **GIVEN** опікуна з email guardian7@example.test ще не вказано в жодній картці
- **WHEN** scheduler1 створює картку з типом «Child», ім'ям «Client Seven», датою народження 2015-03-02, мовою сеансів «Spanish», ім'ям опікуна «Guardian Seven» і email опікуна guardian7@example.test
- **THEN** картку створено, у ній показано дані дитини й опікуна
- **AND** під час утримання слоту біля client7 показано email опікуна

### Requirement: Дані опікуна обов'язкові для дитини

IF у картці з типом «Child» ім'я опікуна порожнє або email опікуна порожній чи некоректний, THEN the system SHALL не створювати картку, показати повідомлення «Enter the guardian's name and a valid email.» і лишити всі введені дані у формі.

#### Scenario: AC-CARD-03 Порожнє ім'я або email опікуна

- **GIVEN** scheduler1 заповнює картку з типом «Child», ім'ям «Client Eight», датою народження 2016-01-10 і мовою «English»
- **WHEN** ім'я або email опікуна залишено порожнім і scheduler1 зберігає картку
- **THEN** картку не створено, scheduler1 бачить повідомлення «Enter the guardian's name and a valid email.»
- **AND** усі введені дані лишаються у формі

### Requirement: Терапевт бачить картки лише своїх клієнтів

WHEN терапевт відкриває список своїх клієнтів, the system SHALL показати картки лише тих клієнтів, у яких з ним є утримання зі статусом «Held» або сеанс зі статусом «Confirmed», з усіма даними анкети (для дитини — з даними опікуна), а якщо таких клієнтів немає — повідомлення «No clients yet. Clients appear here when a scheduler holds a slot with you.» і жодної картки.

#### Scenario: AC-CARD-04 Список своїх клієнтів

- **GIVEN** client6 має утримання зі статусом «Held» у therapist1, client7 — сеанс зі статусом «Confirmed» у therapist1, а client9 — утримання зі статусом «Held» у therapist2
- **WHEN** therapist1 відкриває список своїх клієнтів
- **THEN** він бачить картки client6 і client7 з усіма даними анкети (для client7 — з даними опікуна)
- **AND** не бачить client9

#### Scenario: AC-CARD-09 Своїх клієнтів ще немає

- **GIVEN** therapist2 не має жодного утримання зі статусом «Held» і жодного сеансу зі статусом «Confirmed»
- **WHEN** therapist2 відкриває список своїх клієнтів
- **THEN** він бачить повідомлення «No clients yet. Clients appear here when a scheduler holds a slot with you.»
- **AND** не бачить жодної картки

### Requirement: Чужа картка недоступна терапевту

IF терапевт відкриває картку клієнта, у якого з ним немає утримання зі статусом «Held» чи сеансу зі статусом «Confirmed», зокрема за прямим посиланням, THEN the system SHALL показати повідомлення «You don't have access to this client.», не показувати жодних даних цього клієнта й не змінювати його картку.

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

IF терапевт пробує створити картку клієнта, зокрема відкривши форму нової картки за прямим посиланням, THEN the system SHALL не створювати картку, показати повідомлення «Only schedulers and admins can create client cards.» і не змінювати кількість карток клієнтів.

#### Scenario: AC-CARD-06 Терапевт пробує створити картку

- **GIVEN** therapist1 увійшов у застосунок
- **WHEN** він відкриває форму нової картки клієнта за прямим посиланням і пробує створити картку
- **THEN** картку не створено, therapist1 бачить повідомлення «Only schedulers and admins can create client cards.»
- **AND** кількість карток клієнтів не змінилася

### Requirement: Планувальник і адміністратор бачать усі картки

WHEN планувальник або адміністратор відкриває список клієнтів, the system SHALL показати картки всіх клієнтів, у картці дитини — з даними опікуна.

#### Scenario: AC-CARD-10 Усі картки для планувальника й адміністратора

- **GIVEN** існують картки client6, client7 і client9
- **WHEN** scheduler2 або admin1 відкриває список клієнтів
- **THEN** кожен із них бачить усі три картки
- **AND** у картці client7 — дані опікуна
