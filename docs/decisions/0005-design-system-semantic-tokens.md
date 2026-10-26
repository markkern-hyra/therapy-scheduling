# 0005. Дизайн-система: семантичні токени shadcn/ui, світла й темна тема, власні компоненти

- Статус: прийнято; замінює 0004
- Дата: 2026-10-26
- AC: — (вигляд інтерфейсу; тексти станів беремо дослівно з AC PM, див. `DESIGN.md`, розділ 6)

## Контекст

ADR 0004 (WS6) дав одну світлу тему з власними іменами токенів (`surface`, `ink`, `brand`, `line-strong`, `danger`),
прибрав палітру Tailwind (`--color-*: initial`) і чотири компоненти без `className`. Після WS7 цього замало:

- PM у «Вигляді і тоні» (`requirements/product.md`, знімок 2026-10-26) лишила темну тему на вибір розробників;
  курс вимагає світлу й темну тему, семантичні пари з іменами shadcn/ui (`background`/`foreground`,
  `primary`/`primary-foreground`, `muted`, `destructive`, `border`, `input`, `ring`) і статуси домену;
- агенти (Claude Code, Cursor, `/design`) за замовчуванням пишуть класи з іменами shadcn/ui — власні імена вони
  вгадують і помиляються;
- правило «лише токени» має перевіряти CI, а не лише відсутність палітри: `--color-*: initial` мовчки вимикає
  сирий клас (`bg-white` просто не діє), і помилку видно лише на екрані.

## Рішення

- **Правила — `DESIGN.md` у корені** (`CLAUDE.md` імпортує `@DESIGN.md`, `AGENTS.md` має розділ «Дизайн-система»).
  Джерело — оновлений артефакт Claude Design «Therapy Scheduling» (`project/README.md`, `project/tokens.json`);
  канон у репо — `DESIGN.md` і `globals.css`, артефакт оновлюємо тим самим PR, що й токени.
- **Токени — семантичні пари shadcn/ui в OKLCH:** `background`, `foreground`, `card`, `card-foreground`, `primary`,
  `primary-foreground`, `muted`, `muted-foreground`, `destructive`, `border`, `input`, `ring` і статуси
  `status-held`, `status-confirmed` з парами `*-foreground`. `secondary`, `accent` і `popover` не заводимо, доки
  немає компонента, якому вони потрібні.
- **Дві теми за системою:** значення в `:root` і `@media (prefers-color-scheme: dark)`, класи — `@theme inline` з
  `--color-*` на кожен токен. Перемикача й класу `.dark` немає; `dark:`-класи на сторінках не потрібні.
- **Контраст** кожної пари в обох темах пораховано й записано в `DESIGN.md` (текст ≥ 4.5:1, межі полів і фокус ≥ 3:1).
- **Компоненти — власні, на токенах** (`Button`, `Input`, `Label`, `Alert`, новий `Table`) у `src/components/ui`,
  без `className`: сторінка не може перефарбувати компонент.
- **Палітру Tailwind не вимикаємо** (`--color-*: initial` прибрано); сирі кольори ловить `npm run check:design`
  (`scripts/check-design-tokens.mjs` з матеріалів курсу) у job «Дизайн-система: лише токени» окремого workflow
  `.github/workflows/architecture.yml`.

## Розглянуті варіанти

- **shadcn/ui через `npx shadcn init`** — ні: додає залежності (`@base-ui/react`, `class-variance-authority`, `cn`,
  `lucide-react`, `tw-animate-css`), переписує `globals.css` (блок `.dark`, `@custom-variant dark`), а його
  компоненти приймають `className`, тож сторінка знову може принести свої кольори. Для п'яти простих компонентів
  власний код коротший; імена токенів ті самі, тож перейти на shadcn/ui пізніше — заміна файлів у `ui`.
- **Лишити імена й одну тему з ADR 0004** — ні: не збігається з тим, що пишуть агенти й чого вимагає курс; темну
  тему довелося б додавати потім з перейменуванням усіх класів.
- **Темна тема класом `.dark` з перемикачем** — ні: перемикача немає у вимогах PM; два способи (клас і система)
  змішувати не можна, а системний не потребує ні JavaScript, ні збереженого вибору.
- **Лишити `--color-*: initial`** — ні: сирий клас мовчки нічого не робить, і порушення видно лише на екрані;
  `check:design` показує файл і рядок у CI.

## Наслідки

- Новий колір — лише через `DESIGN.md` (розділ 9): обидві теми, контраст, три місця в `globals.css`, `tokens.json`
  артефакту.
- Статуси слотів і утримань (задача 2.1 зрізу 1, `StatusBadge`) беруть `status-held`, `status-confirmed` і `muted`,
  без нових кольорів.
- Кожна сторінка тепер має й темний вигляд: знімки «після» — в обох темах (`docs/img/ws7-after-*`).

## Як перевіряємо

- `npm run check:design` локально й job «Дизайн-система: лише токени» в `.github/workflows/architecture.yml` на кожен
  PR і push у `main`: hex, `bg-[#…]`, сирі палітри й кольори в `style={{ … }}` поза `src/components/ui` і
  `globals.css` — червоний прогін.
- Контраст — таблиця в `DESIGN.md`; вигляд — знімки `/login`, `/`, `/clients` у світлій і темній темі в `docs/img/`.
