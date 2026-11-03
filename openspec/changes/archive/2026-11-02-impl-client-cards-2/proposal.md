# Пропозиція розробника: реалізація уточнень зрізу 2

## Why

PM уточнила зріз 2 (зміна специфікації `clarify-client-cards`, вимога HryhoriiHaponiukQuitCode/therapy-scheduling-spec#19).
Правило «Свій клієнт» змінилося, а форма картки, порожній список і неіснуюча картка мають нові тексти. Ця зміна — план, як
реалізувати нові й змінені AC так, щоб кожен мав код, тест з AC ID у назві й рядок у `docs/conformance.md`.

## What Changes

Покриває AC:

- `clients`: AC-CARD-02, AC-CARD-04, AC-CARD-12, AC-CARD-13, AC-CARD-14, AC-CARD-15, AC-CARD-16
- `access`: AC-CARD-11

AC-CARD-06 уже реалізовано за новим текстом (`/clients/new` показує відмову без форми). Поведінку специфікації ця зміна не
змінює (`skip_specs: true`).
