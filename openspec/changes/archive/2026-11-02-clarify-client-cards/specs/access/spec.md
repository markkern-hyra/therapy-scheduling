## MODIFIED Requirements

### Requirement: Без ролі — лише повідомлення

IF користувач увійшов у застосунок, але не має ролі, THEN the system SHALL показувати йому лише повідомлення «Your account has no access yet. Contact an administrator.» і дію «Sign out», без жодних даних клієнтів, і не змінювати жодної картки.

#### Scenario: AC-CARD-11 Користувач без ролі

- **GIVEN** користувач newuser1@example.test увійшов, але не має ролі
- **WHEN** він відкриває застосунок або картку client6 за прямим посиланням
- **THEN** він бачить лише повідомлення «Your account has no access yet. Contact an administrator.» і дію «Sign out», жодних даних клієнтів не показано
- **AND** жодна картка не змінилася
