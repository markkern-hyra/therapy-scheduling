# Tasks

Вертикальні задачі: міграція + дія + сторінка + тести `it("AC-…: …")` + рядки `docs/conformance.md` в тому самому PR.
Перевірка кожної: `npm run lint`, `typecheck`, `test`, `ac:coverage`, `check:design`, `check:boundary`; для міграції —
`db-check` у PR і `db-deploy` після merge.

## 1. Свій клієнт і дані без ролі

- [x] 1.1 Міграція: новий `private.is_own_client` і перевірка ролі в «own»-гілках політик `slots` і `holds`; тести бази
  (PGlite): AC-CARD-14 через зсув `slots.starts_at`, розширений AC-CARD-11 запитами до `slots` і `holds`; мутація: повернути
  стару умову — тест червоний.
  Done when: AC-CARD-04, AC-CARD-11, AC-CARD-14.

## 2. Форма картки

- [ ] 2.1 `validateCard`, коди й тексти PM у `messages.ts`, `FieldError`, форма без типу наперед, частковий індекс
  дубліката; ADR 0009; тести: логіка на межах (дата = сьогодні, завтра) і база для дубліката.
  Done when: AC-CARD-12, AC-CARD-13.

## 3. Тексти за роллю й пошук

- [ ] 3.1 `missingCardText`, `emptyClientsText` із текстом PM, `matchesClient`, поле пошуку на `/slots`; тести.
  Done when: AC-CARD-02, AC-CARD-15, AC-CARD-16.

## Workflow follow-up

- В останньому PR: `npm run ac:coverage`, рядки AC «реалізовано», `npx openspec archive impl-client-cards-2 -y`.
