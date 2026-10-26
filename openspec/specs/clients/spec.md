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
