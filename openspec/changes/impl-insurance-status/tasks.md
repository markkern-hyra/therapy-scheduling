# Tasks

Вертикальні задачі: міграція + дія + сторінка + тести `it("AC-…: …")` + рядки `docs/conformance.md` в тому самому PR.
Тест пишемо до коду і бачимо його червоним (`test-driven-development`). Перевірка кожної: `npm run lint`, `typecheck`,
`test`, `build`, `ac:coverage`, `spec:check`, `check:design`, `check:boundary`; для міграції — `db-check` у PR і
`db-deploy` після merge.

## 1. Статус у картці й права в базі

- [x] 1.1 Міграція `insurance_status`: таблиця `client_insurance`, RLS, GRANT, політики select / insert / update і функція `set_insurance_status`
  (design.md, «Дані й RLS»); `insurance.ts` (`insuranceLine`) під підлогою покриття; у картці — `Card` «Insurance» з
  рядком «Insurance: <статус>»; типи БД.
  Тести: unit — «Insurance: Not set» без рядка; база (PGlite) — початковий стан, відмова терапевту на виклик `set_insurance_status`, insert і
  update з незмінним статусом, відмова анонімові. Доказ, що падає: SQL-мутанти на політики insert / update і grant
  анонімові — `npm run mutation:sql` → `KILLED`.
  Done when: AC-INS-01, AC-INS-05, AC-INS-06.

## 2. Позначка статусу

- [x] 2.1 `setInsuranceStatus` (requireRole, лише staff, `rpc("set_insurance_status")`), `runAction(…, notice)`, `MESSAGES.INSURANCE_SAVED`,
  `Alert variant="success"` і рядки `DESIGN.md`; форма з трьома `Choice` лише для staff.
  Тести: дія — staff пише й повертає `?notice=INSURANCE_SAVED`, терапевт — без запису; база — планувальник позначає,
  адміністратор змінює, інший планувальник бачить, терапевт бачить статус свого клієнта й не бачить чужого. Доказ, що
  падає: SQL-мутант select без `is_own_client`; TS-мутант на перевірку ролі в дії (`npm run mutation:sql` → I8).
  Done when: AC-INS-02, AC-INS-03, AC-INS-04.

## 3. UAT на кожен AC

- [ ] 3.1 `tests/e2e/insurance.spec.ts`: один `test` на кожен AC-INS-01…06 з дослівним «Тоді» (`given` / `when` /
  `thenStep`), `@writes` і синтетичні картки з прибиранням; `npm run uat -- --url <прод>` і NC-1 (`npm run uat:nc`);
  звіт `docs/qa/uat/<дата>/`, відео — у описі PR.
  Done when: AC-INS-01, AC-INS-02, AC-INS-03, AC-INS-04, AC-INS-05, AC-INS-06 мають UAT-запис на проді.

## Workflow follow-up

- `docs/qa/proof-pack.md` за шаблоном WS9 (рядок на кожен AC і «Не перевірено»), ретро «що взяти з фабрики».
- В останньому PR зрізу: `npm run ac:coverage`, рядки AC «реалізовано», `npx openspec archive impl-insurance-status -y`.
