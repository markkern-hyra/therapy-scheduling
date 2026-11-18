# Tasks

Вертикальні задачі: код + тести `it("AC-…: …")` + рядки `docs/conformance.md` в тому самому PR. Тест пишемо до коду й
бачимо його червоним (`test-driven-development`). Перевірка кожної: `npm run lint`, `typecheck`, `test`, `build`,
`ac:coverage`, `spec:check`, `check:design`, `check:boundary`; для міграції — `db-check` у PR і `db-deploy` після merge.
Живий виклик моделі — лише `npm run eval` вручну, ніколи в CI.

## 1. Помічник у формі нової картки

- [ ] 1.1 ADR `0010-ai-intake-draft-claude-api.md` і залежності з точними версіями (`@anthropic-ai/sdk`, `zod`,
  `server-only`); `src/lib/ai/` — схема, промпт з `INTAKE_PROMPT_VERSION` і межами `<intake_text>`, `draftFromModelText`
  (правила коду з design.md, рішення 2), `anthropic.ts` (server-only, єдине місце з `ANTHROPIC_API_KEY`), виклик моделі з
  мапінгом збоїв; `requestIntakeDraft` (requireRole → ключ → модель; нічого не пише); `Textarea`, `NewClientForm`, проп
  `draft` у `ClientCardForm`, підпис «Name», `MESSAGES` дослівно з AC, рядки `DESIGN.md`; `cases.json` з таблиці PM,
  `golden.test.ts`, `ai-key.test.ts`, `npm run eval` і `RECORD=1` → `recorded.json` і звіт `evals/reports/…`.
  Тести: реплей GC-01…10 за AC; unit — правила коду (дата в майбутньому, вік 18, email, «Missing» у порядку форми,
  порожній текст без моделі, теги-межі вирізано); дія — не пише, терапевт без моделі. Доказ, що падає: TS-мутант на
  перевірку ролі в дії.
  Done when: AC-INTAKE-01, AC-INTAKE-02, AC-INTAKE-03, AC-INTAKE-04, AC-INTAKE-05, AC-INTAKE-06, AC-INTAKE-07.
- [ ] 1.2 Міграція `assistant_quota` (design.md, «Дані й RLS»), виклик `take_assistant_request` у `requestIntakeDraft`
  перед моделлю; тести збоїв (немає ключа, 429, 529, таймаут, не за схемою, `refusal`); теги `@live-model` / `@no-model`
  у `playwright.config.ts`; e2e без ключа й therapist1.
  Тести: база (PGlite) — 50 запитів дозволено, 51-й — `false`, терапевт і анонім — без лічильника; unit — кожен збій →
  «The assistant is unavailable…»; e2e — повідомлення й ручне створення картки без ключа, therapist1 не бачить поля
  звернення. Доказ, що падає: SQL-мутанти (без `where requests < 50`, без перевірки ролі, `execute` анонімові) →
  `npm run mutation:sql` → `KILLED`.
  Done when: AC-INTAKE-08, AC-INTAKE-09.

## 2. Прод і приймання

- [ ] 2.1 `ANTHROPIC_API_KEY` у Vercel Production (людина), `/api/health` з SHA `main`; UAT на проді (`npm run uat`) щонайменше
  на AC-INTAKE-03 (людина підтверджує перед записом) і AC-INTAKE-07 (ін'єкція), плюс AC-INTAKE-01 і AC-INTAKE-09; звіт
  `docs/qa/uat/<дата>/`; рядки `docs/conformance.md`; archive `impl-client-intake-draft`.
  Done when: AC-INTAKE-01, AC-INTAKE-03, AC-INTAKE-07, AC-INTAKE-09 (UAT на проді).
