# Чекліст розробника, день 0

<!--
Заповнюєте ви одразу після заняття, у цьому порядку: власне репо, власні Supabase і Vercel, перший зелений CI, ruleset.
Мета — застосунок працює локально й на вашому прод-URL, міграції в базу застосовує лише CI, а в main усе йде через PR.
Для кожного пункту — доказ: посилання (run CI, PR, preview), назва змінної або знімок екрана в docs/img/
(без справжніх назв клієнта й людей: зображення spec:check не перевіряє).
ЗНАЧЕННЯ СЕКРЕТІВ І ПАРОЛІВ НІКОЛИ НЕ ПИШІТЬ — лише назви змінних і де вони задані.
Заповнений файл (розділи 1–6) — ваш перший PR, тип «Реалізація» (розділ 7): він же перевіряє ruleset. Посилання на сам
цей PR і на preview допишіть наступним PR. Пояснення кроків — README, «Шлях розробника».
Docker не потрібен: локально — лише npm run dev проти вашої бази; міграції на одноразовій базі перевіряє CI (db-check).
-->

Моє репо: https://github.com/markkern-hyra/therapy-scheduling · Прод-URL: https://therapy-scheduling-theta.vercel.app
Репо вимог PM: <!-- https://github.com/<pm>/<team-slug>-spec — ще не отримано (адреса — у чаті команди) --> · Організація Supabase: `mkernytskyi's Org` (Free)

## 1. Інструменти й репо

- [x] Node 24 (`node -v`), Git, GitHub CLI (`gh auth status`); OpenSpec CLI глобально тієї ж версії, що в `package.json`:
      `npm i -g @fission-ai/openspec@1.14.1` → `openspec --version` = `1.14.1` — Node v24.22.0, Git 2.50.1, gh 2.87.3
      (`markkern-hyra`), OpenSpec 1.14.1
- [x] Репо створено з шаблону (**Use this template → Create a new repository**): власник — ваш особистий акаунт, назва —
      `<team-slug>`, **Public** (ruleset на GitHub Free діє лише в публічних репо; PM у нотатці-порівнянні посилається на
      рядки вашого коду) — https://github.com/markkern-hyra/therapy-scheduling (Public, з `koldovsky/2026-quitcode-06-project-template`)
- [x] `git clone https://github.com/<dev>/<team-slug>.git` → `npm ci` → `cp .env.example .env.local`
      (у PowerShell: `Copy-Item .env.example .env.local`) — `npm ci`, `lint`, `typecheck`, `test`, `build`
      (`ƒ Proxy (Middleware)`), `spec:validate`, `spec:check`, `ac:coverage` — зелені
- [x] CodeRabbit (GitHub App) встановлено на це репо (github.com/apps/coderabbitai → Configure → Only select repositories) —
      [img/coderabbit.png](img/coderabbit.png)
- [x] (Якщо PM надіслав список справжніх назв клієнта особистим повідомленням) — локальний `product/denylist.local.txt`
      (у `.gitignore`; `npm run spec:check` читає його й значень не друкує) — не потрібно: PM списку не надсилав

## 2. Supabase: власна база

- [x] Організацію й проєкт створено у вашому акаунті (один із двох безкоштовних проєктів; регіон — найближчий) —
      проєкт `therapy-scheduling`, регіон `eu-west-1` (Ірландія)
- [x] Authentication: «Allow new users to sign up» **вимкнено**, «Confirm email» **вимкнено**
      (точні назви й місце перемикачів перевірте в інтерфейсі) — [img/auth-signups.png](img/auth-signups.png)
      (обидва перемикачі в блоці User Signups), [img/auth-email.png](img/auth-email.png) (провайдер Email увімкнено)
- [x] (Після розділу 4, коли є прод-URL) Authentication → URL Configuration: Site URL = прод-URL Vercel; Redirect URLs
      `http://localhost:3000/**`, `https://*-<slug>.vercel.app/**` — [img/auth-urls.png](img/auth-urls.png):
      Site URL `https://therapy-scheduling-theta.vercel.app`, Redirect URLs `http://localhost:3000/**`,
      `https://*-mkernytskyi-8489s-projects.vercel.app/**`
- [x] `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
      (Project Settings → API Keys; точну назву розділу перевірте в інтерфейсі) і `DEMO_USER_PASSWORD` (≥ 8 символів).
      Значення не комітимо й не вставляємо в чат — задано всі чотири, лише в `.env.local`

## 3. GitHub: environment `production` і секрети

- [x] Settings → Environments → `production` (якщо перший прогін CI вже створив його автоматично — відкрийте наявний;
      `Production`, яке створює Vercel для своїх деплоїв, — те саме середовище: регістр у назвах GitHub не розрізняє):
      **Deployment branches** = Selected branches → `main` — [img/env-production.png](img/env-production.png)
- [x] Секрет environment `SUPABASE_DB_URL` = рядок **Session pooler** (порт **5432**, не 6543) з Supabase → **Connect**;
      пароль у рядку percent-encoded — `SUPABASE_DB_URL` (environment `production`)
- [x] Запасний шлях (лише якщо `--db-url` не працює): секрети environment `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`,
      `SUPABASE_PROJECT_ID` (README, «Міграції в прод: запасний шлях») — не потрібно: основний шлях `--db-url` працює
      (на запасний шлях `db-deploy` переходить, лише коли `SUPABASE_DB_URL` видалено — README, «Міграції в прод»)
- [x] (Необов'язково) секрет репо `SPEC_DENYLIST` — ті самі справжні назви через кому, для CI — не потрібно: PM списку
      не надсилав

## 4. Vercel

- [x] Add New → Project → імпорт вашого репо, Node 24.x — https://therapy-scheduling-theta.vercel.app
      (Node 24.x — з `engines.node` у `package.json`)
- [x] Змінні Production і Preview — лише `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
      `SUPABASE_SECRET_KEY` — **ніколи** — [img/vercel-env.png](img/vercel-env.png)
- [x] Settings → Deployment Protection → **Require Log In** вимкнено → Save (інакше PM і викладач не відкриють ваші preview;
      точну назву перемикача перевірте в інтерфейсі) — [img/vercel-protection.png](img/vercel-protection.png)
- [x] Після змінних — редеплой; прод-URL відкривається — https://therapy-scheduling-theta.vercel.app (`/` → `/login`)

## 5. База й перший зелений CI

- [x] Actions → CI → **Run workflow** (гілка `main`, `include_seed` ✓) → job `db-deploy` застосував першу міграцію й сид —
      https://github.com/markkern-hyra/therapy-scheduling/actions/runs/39597800765/attempts/2
      (`Applying migration 20261012000000_profiles_and_roles.sql`, `Seeding data from supabase/seed.sql`; спроба 1 впала
      на `password authentication failed` — пароль бази скинуто й секрет `SUPABASE_DB_URL` оновлено)
- [x] `npm run users:demo` (синтетичні користувачі з `supabase/demo-users.json`) → `npm run dev` → `http://localhost:3000` →
      вхід як `admin@example.test` працює локально й на прод-URL
- [x] CI на `main` зелений: `spec`, `app`, `conformance`, `db-check`, `db-deploy` —
      https://github.com/markkern-hyra/therapy-scheduling/actions/runs/39597800765/attempts/2

## 6. Ruleset `solo-main` (лише після зеленого CI на `main`)

- [x] Settings → Rules → Rulesets → **New ruleset → Import a ruleset** → `solo-main.json` з курсового репо
      (`materials/rulesets/solo-main.json`) або вручну: target — гілка за замовчуванням (`main`); Restrict deletions;
      Block force pushes; Require a pull request — **0 approvals** (колег у вашому репо немає); Require status checks
      (джерело GitHub Actions, без «up to date»): `spec`, `app`, `conformance`, `db-check`; Allowed merge methods —
      **Squash** і **Merge**; Bypass list — **порожній** (навіть для власника); Enforcement — Active
      (точні назви полів перевірте в інтерфейсі) — [img/ruleset.png](img/ruleset.png); імпорт із
      `koldovsky/2026-quitcode-06-specs-in-practice-hw`, правила звірено через API

## 7. Перший PR (перевірка ruleset-у)

- [ ] `git switch -c setup/bootstrap` → цей файл із доказами розділів 1–6 → push → `gh pr create --web` (тип «Реалізація»)
      → окремим коментарем `@coderabbitai review` — <!-- посилання на PR (наступним PR) -->
- [ ] Поки перевірки не зелені, кнопка merge заблокована; push у `main` напряму відхиляється —
      [img/merge-blocked.png](img/merge-blocked.png) (PR #2: обов'язкові перевірки ще йдуть, «Merge pull request»
      неактивна); відмову прямого push у `main` ще не перевірено
- [ ] Vercel створив preview для PR — <!-- посилання на preview (наступним PR) -->
- [ ] **Squash and merge** → прод-деплой Vercel пройшов — <!-- посилання -->
- [ ] (З першою задачею, що має міграцію) `db-check` зелений, після merge `db-deploy` застосував її у вашу базу — <!-- посилання на run -->

## 8. Вимоги PM і специфікація

- [ ] Адресу репо вимог PM узято з чату команди; на зустрічі команди (дні 0–2, до кінця 15.10, організує PM; якщо
      команда не зібралася — діра в чат команди до обіду 16.10) — перший раунд питань до брифу
- [ ] PM написав у чаті команди «вимоги оновлено» (у курсі перші вимоги — до кінця 16.10) → у Claude Code чи Cursor
      `/requirements-sync <pm>/<team-slug>-spec` → PR «Оновлення вимог» злито; шапка `docs/conformance.md` показує
      адресу, джерело (issues чи docs) і дату знімка — <!-- посилання на PR -->
- [ ] Читання вимог: скіл `spec-clarify` → питання — issues «Питання до вимог» у репо PM через вебформу → журнал
      `docs/spec-reading.md` — <!-- посилання на issues -->
- [ ] Переклад у специфікацію (гілка `spec/add-<зріз>`): `/opsx:propose add-<зріз>` → `npx openspec validate add-<зріз> --strict`
      → скіл `spec-review` → `npx openspec archive add-<зріз> -y` → `/conformance` → PR «Специфікація» злито;
      `npm run ac:coverage` без «вимогу PM ще не перекладено» — <!-- посилання на PR -->
