# insurance-status Specification

## Purpose
Статус перевірки страхування в картці клієнта: планувальник або адміністратор позначає, чи прийнято страхування, чи
клієнт платить сам, а кожен, хто бачить картку, бачить цей статус; терапевт — лише в картках своїх клієнтів.

## Requirements

### Requirement: Початковий статус «Not set»

WHERE статус перевірки страхування клієнта ще ніхто не позначав, зокрема в картках, створених у зрізах 1–2, the system SHALL показувати в картці клієнта «Insurance: Not set».

#### Scenario: AC-INS-01 Статус ще не позначено

- **GIVEN** картку client6 створено, і статус перевірки страхування ще ніхто не позначав
- **WHEN** scheduler1 відкриває картку client6
- **THEN** в картці показано «Insurance: Not set»

### Requirement: Планувальник або адміністратор позначає статус

WHEN планувальник або адміністратор позначає в картці клієнта статус перевірки страхування «Verified», «Not accepted» або «Private pay», the system SHALL зберегти цей статус, показати повідомлення «Insurance status saved.» і показувати в картці «Insurance: <статус>» кожному, хто бачить картку.

#### Scenario: AC-INS-02 Планувальник позначає «Verified»

- **GIVEN** картка client6 показує «Insurance: Not set»
- **WHEN** scheduler1 позначає статус перевірки страхування «Verified»
- **THEN** scheduler1 бачить повідомлення «Insurance status saved.»
- **AND** картка client6 показує «Insurance: Verified» і після того, як scheduler1 відкриє її знову

#### Scenario: AC-INS-03 Адміністратор змінює статус, інший планувальник бачить його

- **GIVEN** картка client7 показує «Insurance: Verified»
- **WHEN** admin1 змінює статус перевірки страхування на «Private pay», а потім scheduler2 відкриває картку client7
- **THEN** і admin1, і scheduler2 бачать у картці «Insurance: Private pay»

### Requirement: Терапевт лише бачить статус свого клієнта

WHILE терапевт переглядає картку свого клієнта, the system SHALL показувати в ній «Insurance: <статус>» і не пропонувати йому змінити статус перевірки страхування.

#### Scenario: AC-INS-04 Терапевт бачить статус свого клієнта

- **GIVEN** client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted»
- **WHEN** therapist1 відкриває картку client6
- **THEN** він бачить «Insurance: Not accepted»
- **AND** змінити статус перевірки страхування в картці йому не запропоновано

### Requirement: Терапевт не змінює статус в обхід сторінок

IF терапевт напряму, оминаючи сторінки застосунку, пробує змінити статус перевірки страхування клієнта, THEN the system SHALL не змінювати статус.

#### Scenario: AC-INS-05 Спроба терапевта напряму

- **GIVEN** client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted»
- **WHEN** therapist1 напряму, оминаючи сторінки застосунку, пробує змінити статус перевірки страхування client6 на «Verified»
- **THEN** статус не змінився
- **AND** scheduler1 у картці client6 бачить «Insurance: Not accepted»

### Requirement: Без входу статусу не видно

IF користувач не увійшов у застосунок і відкриває картку клієнта за прямим посиланням, THEN the system SHALL показати лише сторінку входу без статусу страхування й інших даних клієнта і не змінювати статус.

#### Scenario: AC-INS-06 Картка за прямим посиланням без входу

- **GIVEN** користувач не увійшов у застосунок, а картка client6 показує «Insurance: Verified»
- **WHEN** він відкриває картку client6 за прямим посиланням
- **THEN** він бачить лише сторінку входу, статусу страхування й інших даних client6 не показано
- **AND** scheduler1 після цього бачить у картці client6 «Insurance: Verified»
