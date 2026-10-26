# Дизайн-система: Therapy Scheduling

- **Джерело:** артефакт Claude Design (Design System) «Therapy Scheduling» — https://claude.ai/artifact/LmSdGitY1aeGTpppnvrLb6
  (приватний; `project/README.md` — бренд-бук, `project/tokens.json` — токени; знімок — в описі PR дизайн-системи)
- **Вхід від PM:** розділ «Вигляд і тон» у `requirements/product.md` (знімок 2026-10-26)
- **Код:** токени — `src/app/globals.css`; компоненти — `src/components/ui/` (власні, на токенах; ADR 0005);
  перевірка — `npm run check:design`
- **Рішення:** `docs/decisions/0005-design-system-semantic-tokens.md` (замінює ADR 0004)

## 1. Огляд

Внутрішній вебзастосунок однієї практики психотерапії для адміністраторів, планувальників і терапевтів; працюють за
робочим столом, щодня, між сеансами й дзвінками. Тон — спокійний, стриманий, охайний; уникаємо декору, яскравих
кольорів, тіней, іконок і емодзі. Щільність середня: розклад, списки й таблиці компактні, форми просторі. Інтерфейс
англійською, коротко й ввічливо: повідомлення кажуть, що сталося і що робити далі. Дві теми — світла й темна — за
налаштуванням системи (`prefers-color-scheme`), без перемикача.

## 2. Кольори

Семантичні токени з іменами shadcn/ui, значення — OKLCH. У сторінках — лише утиліти з колонки «Клас», ніколи hex,
`bg-[#…]` чи сирі палітри (`zinc-500`, `bg-white`). Один приглушений бірюзовий акцент (`primary`) для головної дії;
червоний (`destructive`) — лише для помилок.

| Токен | Для чого | Світла | Темна | Клас |
|---|---|---|---|---|
| `background` / `foreground` | тло сторінки й основний текст | `oklch(1 0 0)` / `oklch(0.205 0 0)` | `oklch(0.17 0.004 286)` / `oklch(0.96 0.002 286)` | `bg-background`, `text-foreground` |
| `card` / `card-foreground` | таблиці, поля вводу | `oklch(1 0 0)` / `oklch(0.205 0 0)` | `oklch(0.21 0.005 286)` / `oklch(0.96 0.002 286)` | `bg-card`, `text-card-foreground` |
| `primary` / `primary-foreground` | основна дія (одна на екран), посилання навігації | `oklch(0.51 0.086 186)` / `oklch(0.985 0 0)` | `oklch(0.75 0.1 184)` / `oklch(0.2 0.03 190)` | `bg-primary`, `text-primary-foreground`, `text-primary` |
| `primary-hover` | тло головної кнопки при наведенні (світла — темніше, темна — світліше; текст той самий) | `oklch(0.46 0.078 186)` | `oklch(0.81 0.09 184)` | `hover:bg-primary-hover` (лише в `Button`) |
| `muted` / `muted-foreground` | заголовки таблиць, наведення; підписи, порожні стани | `oklch(0.967 0.001 286.4)` / `oklch(0.442 0.017 285.8)` | `oklch(0.27 0.006 286)` / `oklch(0.74 0.012 286)` | `bg-muted`, `text-muted-foreground` |
| `destructive` | лише текст і рамка помилки | `oklch(0.51 0.19 27)` | `oklch(0.71 0.16 22)` | `text-destructive`, `border-destructive` |
| `border` | роздільники, межа таблиці й шапки | `oklch(0.92 0.004 286.3)` | `oklch(0.3 0.006 286)` | `border-border`, `divide-border` |
| `input` | межа поля вводу й другорядної кнопки | `oklch(0.552 0.016 285.9)` | `oklch(0.56 0.014 286)` | `border-input` |
| `ring` | кільце фокусу (у `globals.css`, для всіх елементів) | `oklch(0.51 0.086 186)` | `oklch(0.75 0.1 184)` | — (`:focus-visible`) |
| `status-held` / `status-held-foreground` | статус «Held» | `oklch(0.953 0.051 180.8)` / `oklch(0.44 0.072 188)` | `oklch(0.31 0.05 186)` / `oklch(0.88 0.07 182)` | `bg-status-held`, `text-status-held-foreground` |
| `status-confirmed` / `status-confirmed-foreground` | статус «Confirmed» | = `primary` / `primary-foreground` | = `primary` / `primary-foreground` | `bg-status-confirmed`, `text-status-confirmed-foreground` |

- «Expired» і «Past» — `bg-muted text-muted-foreground`; вільний слот — без бейджа.
- `secondary`, `accent` і `popover` не заводимо: другорядна кнопка — `border-input bg-background`, наведення —
  `bg-muted`, меню й діалогів немає. З'являться — через розділ 9.
- У темній темі акцент світлий, тому текст на ньому темний (`primary-foreground`); білим його не заміняємо.

### Контраст

Пораховано за WCAG 2.x з OKLCH → sRGB (усі значення в межах sRGB).

| Пара | Світла | Темна | Норма |
|---|---|---|---|
| `foreground` на `background` | 17.9 | 17.0 | ≥ 4.5 |
| `foreground` на `muted` | 16.3 | 13.4 | ≥ 4.5 |
| `card-foreground` на `card` | 17.9 | 15.8 | ≥ 4.5 |
| `muted-foreground` на `background` | 7.7 | 8.3 | ≥ 4.5 |
| `muted-foreground` на `card` | 7.7 | 7.7 | ≥ 4.5 |
| `muted-foreground` на `muted` | 7.0 | 6.5 | ≥ 4.5 |
| `primary` (посилання) на `background` | 5.5 | 9.0 | ≥ 4.5 |
| `primary-foreground` на `primary` | 5.3 | 8.4 | ≥ 4.5 |
| `primary-foreground` на `primary-hover` | 6.6 | 10.3 | ≥ 4.5 |
| `destructive` на `background` | 6.3 | 6.9 | ≥ 4.5 |
| `destructive` на `card` | 6.3 | 6.4 | ≥ 4.5 |
| `status-held-foreground` на `status-held` | 6.7 | 9.2 | ≥ 4.5 |
| `status-confirmed-foreground` на `status-confirmed` | 5.3 | 8.4 | ≥ 4.5 |
| `input` на `card` | 4.8 | 3.8 | ≥ 3 |
| `input` на `background` | 4.8 | 4.1 | ≥ 3 |
| `ring` на `background` | 5.5 | 9.0 | ≥ 3 |
| `ring` на `card` | 5.5 | 8.3 | ≥ 3 |

## 3. Типографіка

Geist через `next/font` (`--font-sans`), для дати й часу — Geist Mono (`font-mono`). Дата й час —
America/Los_Angeles, `2026-11-03 14:30`; дата — `2026-11-03`.

| Роль | Клас | Де |
|---|---|---|
| Заголовок сторінки | `text-2xl font-semibold` | один `h1` на сторінку |
| Заголовок розділу | `text-lg font-semibold` | `h2`: форма, список |
| Основний текст | `text-base` | текст, значення полів |
| Рядки таблиць, повідомлення | `text-sm` | `Table`, `Alert` |
| Підпис поля, текст кнопки | `text-sm font-medium` | `Label`, `Button` |
| Заголовок колонки, бейдж | `text-xs font-medium` | `TableHead`, статус |
| Підпис, допоміжний текст | `text-sm text-muted-foreground` | порожні стани, `dt` |
| Дата й час | `font-mono text-sm` | слоти, «Held until», дата народження |

## 4. Відступи й радіуси

- Кроки Tailwind `1`, `2`, `3`, `4`, `6` (4–24px), інших немає. Поле й кнопка — `px-3 py-2`; клітинка таблиці —
  `px-3 py-2`; між полями форми — `gap-4`; між секціями й бічні поля — `gap-6`, `px-6`.
- Вміст — одна колонка `max-w-3xl` (768px), форми — `max-w-sm` (384px); сторінка входу — по центру.
- Радіуси: `rounded-sm` (4px) — кнопки й поля; `rounded-md` (8px) — повідомлення й рамка таблиці; `rounded-full` —
  бейджі. Тіней немає: межі — рамка 1px.

## 5. Компоненти й варіанти

Лише з `@/components/ui`. Компоненти не приймають `className`: вигляд — лише через варіанти, щоб сторінка не
перефарбувала компонент. Новий варіант чи компонент — у `src/components/ui` на токенах, з рядком у цій таблиці.

| Компонент | Варіанти | Правило |
|---|---|---|
| `Button` | `primary`, `secondary` | `primary` — одна основна дія на екран («Create client», «Sign in»); решта — `secondary`: «Sign out», «Show» і дії в рядках таблиці («Hold», «Confirm»), бо їх на екрані багато |
| `Input` + `Label` | — | `Label` обгортає поле (`<Label>Email<Input … /></Label>`) — зв'язок без `htmlFor`; placeholder не замість підпису |
| `Table` (`TableHeader`, `TableBody`, `TableHead`, `TableCell`) | — | `aria-labelledby` на заголовок розділу; рядки — звичайні `<tr>` |
| `Alert` | помилка | `role="alert"`, текст дослівно з AC, над формою чи таблицею |
| `Badge` (зріз 1, задача 2.1) | `held`, `confirmed`, `muted` | бейдж-пігулка на токенах статусів у `src/components/ui`; завжди зі словом статусу |

Компоненти застосунку (`AppNav`, `ErrorMessage`, далі `StatusBadge`, що перетворює статус на варіант `Badge`) — у
`src/app/_components/` і складаються з компонентів `ui` без власних кольорів.

## 6. Стани

Тексти — дослівно з AC PM. Рядки з AC-CARD — зріз 2 (вимога PM Sofiia-pm/therapy-scheduling-spec#19): цільовий
стан, який з'явиться в задачах `impl-client-cards`; до того, наприклад, `requireRole` перенаправляє на `/`.

| Стан | Як виглядає | Приклад тексту |
|---|---|---|
| Порожній список | `text-sm text-muted-foreground` замість таблиці, одне-два речення | «No clients yet. Clients appear here when a scheduler holds a slot with you.» (AC-CARD-09), «No free slots on this day.» (AC-HOLD-24) |
| Помилка дії | `Alert` над формою; введене лишається у формі, запису немає | «Enter the guardian's name and a valid email.» (AC-CARD-03), «This slot is no longer available.» (AC-HOLD-03) |
| Відмова в доступі | сторінка лише з `Alert` і поясненням, без даних | «You don't have access to this client.» (AC-CARD-05), «Only schedulers and admins can create client cards.» (AC-CARD-06) |
| Без ролі | сторінка лише з повідомленням, без навігації й даних | «Your account has no access yet. Contact an administrator.» (AC-CARD-11) |
| Не увійшов | перенаправлення на сторінку входу | — (AC-CARD-07) |
| Завантаження | сторінки рендеряться на сервері; окремого індикатора немає | — |
| Успіх | повернення на ту саму сторінку з новим рядком у списку; окремого повідомлення немає | — |
| Недоступна дія | кнопку не показуємо (не `disabled`) | — |

## 7. Доступність — мінімум

- `Label` у кожного поля (обгортає поле); помилка форми — `Alert` з `role="alert"`.
- Видимий фокус: суцільне кільце `ring` 2px з відступом 2px на кожному інтерактивному елементі
  (`:focus-visible` у `globals.css`); Tab проходить форму по порядку.
- Контраст — таблиця в розділі 2, обидві теми.
- Статус ніколи не лише кольором — бейдж завжди зі словом.
- Спершу семантичний HTML (`<button>`, `<table>`, `<label>`, `<dl>`); `aria-*` — там, де HTML бракує.

## 8. Do / Don't

| ✅ Робимо | ❌ Не робимо |
|---|---|
| `bg-primary text-primary-foreground` у `Button` | `bg-zinc-900 text-white`, `bg-[#0f766e]`, `style={{ color: "#…" }}` |
| `Button`, `Input`, `Label`, `Table`, `Alert` з `@/components/ui` | власний `<button className="…">` чи `<table className="…">` у сторінці |
| одна `primary`-кнопка на екран | дві головні дії поруч |
| текст статусу + токени статусу | червоний чи зелений бейдж без слова; статус кольором `destructive` |
| `text-muted-foreground` для другорядного | новий відтінок сірого «лише для цієї сторінки» |
| тексти повідомлень дослівно з AC | «Error!», «Oops», вигуки, емодзі |
| новий токен через розділ 9 | `dark:`-класи на сторінках — темну тему дають токени |

## 9. Як додати токен

1. Опишіть токен у таблиці розділу 2: для чого, значення в обох темах, контраст; те саме — у `tokens.json` артефакту.
2. `src/app/globals.css`: `--<назва>` у `:root` і в `@media (prefers-color-scheme: dark)`.
3. `--color-<назва>: var(--<назва>);` у `@theme inline` → з'являються класи `bg-<назва>`, `text-<назва>`, `border-<назва>`.
4. `npm run check:design` і знімок сторінки у світлій і темній темі.

## 10. Перевірка

- `npm run check:design` — жодного hex, довільного кольору, сирої палітри чи кольору в inline style поза
  `src/components/ui` і `globals.css`. CI: `.github/workflows/architecture.yml`, job «Дизайн-система: лише токени».
- Виняток — коментар `design-ok: <причина>` у тому самому рядку; кожен виняток — з реальною причиною. Зараз
  винятків немає.
- Візуально: знімки `/login`, `/` і `/clients` у світлій і темній темі (`docs/img/ws7-before-*`, `docs/img/ws7-after-*`),
  Tab по формі (`docs/img/ws7-after-login-focus-*`), контраст. Темні знімки «до» збігаються зі світлими: до ADR 0005
  темної теми не було (`color-scheme: light`).
