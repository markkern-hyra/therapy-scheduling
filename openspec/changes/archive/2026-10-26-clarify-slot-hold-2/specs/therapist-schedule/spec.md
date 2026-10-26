## ADDED Requirements

### Requirement: У розкладі — лише ім'я клієнта

WHEN терапевт відкриває свій розклад, the system SHALL показувати в утриманнях і сеансах лише ім'я клієнта, без його email.

#### Scenario: AC-HOLD-40 Ім'я клієнта без email

- **GIVEN** therapist1 має утримання за client1 зі статусом «Held»
- **WHEN** therapist1 відкриває свій розклад
- **THEN** в утриманні показано ім'я client1, але не показано його email
- **AND** окремого списку клієнтів therapist1 у зрізі 1 не має
