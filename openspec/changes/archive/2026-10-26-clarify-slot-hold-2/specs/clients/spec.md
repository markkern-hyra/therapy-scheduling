## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Ім'я без пробілів по краях

WHEN планувальник або адміністратор створює клієнта, the system SHALL зберігати й показувати ім'я клієнта без пробілів на початку й у кінці, а ім'я лише з пробілів вважати порожнім.

#### Scenario: AC-HOLD-41 Ім'я з пробілів і ім'я з пробілами по краях

- **GIVEN** клієнтів з email client4@example.test і client5@example.test ще немає
- **WHEN** планувальник створює клієнта з іменем «   » (лише пробіли) і email client5@example.test, а потім клієнта з іменем « Client Four » і email client4@example.test
- **THEN** першого клієнта не створено, і планувальник бачить повідомлення «Enter the client's name and a valid email.»
- **AND** другого створено, і в картці його ім'я показано як «Client Four»
