# Дизайн-система: Therapy Scheduling

- **Джерело:** артефакт Claude Design (Design System) «Therapy Scheduling» — https://claude.ai/artifact/LmSdGitY1aeGTpppnvrLb6
  (приватний; `project/README.md` — бренд-бук, `project/tokens.json` — токени; знімок — в описі PR дизайн-системи);
  теплий спокійний напрям — аудит дизайну https://claude.ai/artifact/PN4bLEFMwYZ3AkjUPedMMj (приватний; рішення людини:
  шрифт A, пісочний «Held», розклад списком по днях)
- **Вхід від PM:** розділ «Вигляд і тон» у `requirements/product.md` (знімок 2026-10-26)
- **Код:** токени — `src/app/globals.css`; компоненти — `src/components/ui/` (власні, на токенах; ADR 0005);
  перевірка — `npm run check:design`
- **Рішення:** `docs/decisions/0005-design-system-semantic-tokens.md` (замінює ADR 0004)

## 1. Огляд

Внутрішній вебзастосунок однієї практики психотерапії для адміністраторів, планувальників і терапевтів; працюють за
робочим столом, щодня, між сеансами й дзвінками. Тон — теплий, спокійний, стриманий (PM: «інтерфейс не має
відволікати»): теплі нейтральні замість холодних сірих, білі поверхні з м'якою тінню на світлому теплому тлі, один
приглушений шавлієво-бірюзовий акцент для головних дій, червоний — лише для помилок. Стримані лінійні іконки — завжди з
підписом; декору, яскравих кольорів і емодзі немає. Щільність середня: розклад і списки компактні, форми просторі.
Інтерфейс англійською, коротко й ввічливо: повідомлення кажуть, що сталося і що робити далі. Дві теми — світла й
темна — за налаштуванням системи (`prefers-color-scheme`), без перемикача.

## 2. Кольори

Семантичні токени з іменами shadcn/ui, значення — OKLCH. Нейтральні мають теплий відтінок 60–80° і низьку
насиченість, акцент — 172°. `background` — тло сторінки, `card` — поверхні над ним (картки, списки, поля, шапка). У
сторінках — лише утиліти з колонки «Клас», ніколи hex, `bg-[#…]` чи сирі палітри (`zinc-500`, `bg-white`).

| Токен | Для чого | Світла | Темна | Клас |
|---|---|---|---|---|
| `background` / `foreground` | тло сторінки й основний текст | `oklch(0.977 0.004 75)` / `oklch(0.255 0.012 60)` | `oklch(0.175 0.006 70)` / `oklch(0.95 0.006 80)` | `bg-background`, `text-foreground` |
| `card` / `card-foreground` | поверхні: картки, списки, поля, шапка | `oklch(1 0 0)` / `oklch(0.255 0.012 60)` | `oklch(0.215 0.007 70)` / `oklch(0.95 0.006 80)` | `bg-card`, `text-card-foreground` |
| `primary` / `primary-foreground` | основна дія (одна на екран), посилання, знак продукту | `oklch(0.5 0.08 172)` / `oklch(0.985 0.003 90)` | `oklch(0.77 0.09 170)` / `oklch(0.2 0.03 175)` | `bg-primary`, `text-primary-foreground`, `text-primary` |
| `primary-hover` | тло головної кнопки при наведенні | `oklch(0.45 0.075 172)` | `oklch(0.82 0.08 170)` | `hover:bg-primary-hover` (лише в `Button`) |
| `primary-soft` | м'яке тло акценту: поточний розділ, ініціали, обраний `Choice`, коло іконки `LinkCard` | `oklch(0.955 0.025 172)` | `oklch(0.3 0.04 172)` | `bg-primary-soft` (лише в `ui`) |
| `muted` / `muted-foreground` | наведення, нейтральні бейджі, коло порожнього стану; підписи, «Not provided» | `oklch(0.955 0.006 75)` / `oklch(0.47 0.013 60)` | `oklch(0.26 0.008 70)` / `oklch(0.72 0.012 75)` | `bg-muted`, `text-muted-foreground` |
| `destructive` / `destructive-soft` | текст і тло помилки (`Alert`) | `oklch(0.52 0.17 28)` / `oklch(0.965 0.016 25)` | `oklch(0.72 0.15 25)` / `oklch(0.27 0.04 25)` | `text-destructive`, `bg-destructive-soft` |
| `border` | роздільники, рамки поверхонь | `oklch(0.905 0.007 75)` | `oklch(0.3 0.008 70)` | `border-border`, `divide-border` |
| `input` | межа поля вводу й другорядної кнопки | `oklch(0.64 0.012 70)` | `oklch(0.55 0.012 70)` | `border-input` |
| `ring` | кільце фокусу (у `globals.css`, для всіх елементів) | `oklch(0.5 0.08 172)` | `oklch(0.77 0.09 170)` | — (`:focus-visible`) |
| `status-held` / `status-held-foreground` | статус «Held» — пісочний: чекає підтвердження | `oklch(0.95 0.05 85)` / `oklch(0.45 0.09 65)` | `oklch(0.33 0.05 75)` / `oklch(0.88 0.08 85)` | `bg-status-held`, `text-status-held-foreground` |
| `status-confirmed` / `status-confirmed-foreground` | статус «Confirmed» — бірюзовий, у гамі акценту | `oklch(0.93 0.045 172)` / `oklch(0.38 0.07 172)` | `oklch(0.32 0.05 172)` / `oklch(0.88 0.07 170)` | `bg-status-confirmed`, `text-status-confirmed-foreground` |
| `card-shadow` | м'яка тінь поверхні (двошарова, теплий відтінок; у темній — глибша) | `0 1px 2px oklch(0.25 0.02 60 / 0.05), 0 4px 14px oklch(0.25 0.02 60 / 0.06)` | `0 1px 2px oklch(0 0 0 / 0.3), 0 4px 14px oklch(0 0 0 / 0.25)` | `shadow-card` (лише в `ui`) |

- «Past» — бейдж `muted`; вільний слот — без бейджа, слово «Free» приглушене.
- `secondary`, `accent` і `popover` не заводимо: другорядна кнопка — `border-input bg-card`, тиха — `ghost`
  (наведення `bg-muted`), меню й діалогів немає. З'являться — через розділ 9.
- У темній темі акцент світлий, тому текст на ньому темний (`primary-foreground`); білим його не заміняємо.

### Контраст

Пораховано за WCAG 2.x з OKLCH → sRGB (усі значення в межах sRGB).

| Пара | Світла | Темна | Норма |
|---|---|---|---|
| `foreground` на `background` | 14.8 | 16.4 | ≥ 4.5 |
| `foreground` на `muted` | 13.9 | 13.4 | ≥ 4.5 |
| `card-foreground` на `card` | 15.8 | 15.1 | ≥ 4.5 |
| `muted-foreground` на `background` | 6.4 | 7.6 | ≥ 4.5 |
| `muted-foreground` на `card` | 6.8 | 7.1 | ≥ 4.5 |
| `muted-foreground` на `muted` | 6.0 | 6.3 | ≥ 4.5 |
| `primary` (посилання, назва в `LinkCard`) на `card` | 5.7 | 8.8 | ≥ 4.5 |
| `primary` на `background` | 5.4 | 9.5 | ≥ 4.5 |
| `primary` (поточний розділ, ініціали) на `primary-soft` | 5.1 | 6.7 | ≥ 4.5 |
| `primary-foreground` на `primary` | 5.5 | 9.0 | ≥ 4.5 |
| `primary-foreground` на `primary-hover` | 6.8 | 10.6 | ≥ 4.5 |
| `destructive` на `destructive-soft` | 5.4 | 5.8 | ≥ 4.5 |
| `destructive` на `card` | 6.0 | 6.6 | ≥ 4.5 |
| `status-held-foreground` на `status-held` | 6.6 | 8.6 | ≥ 4.5 |
| `status-confirmed-foreground` на `status-confirmed` | 8.0 | 8.9 | ≥ 4.5 |
| `input` на `card` | 3.4 | 3.6 | ≥ 3 |
| `input` на `background` | 3.2 | 3.9 | ≥ 3 |
| `ring` на `background` | 5.4 | 9.5 | ≥ 3 |
| `ring` на `card` | 5.7 | 8.8 | ≥ 3 |
| `primary` (рамка обраного `Choice`) на `primary-soft` | 5.1 | 6.7 | ≥ 3 |

## 3. Типографіка

Figtree через `next/font` (`--font-sans`) — теплий гуманістичний гротеск. Окремого моноширинного шрифту немає: дата й
час — табличні цифри Figtree (`tabular-nums`), тож стовпці часу рівні. Дата й час — America/Los_Angeles,
`2026-11-03 14:30`; дата — `2026-11-03`.

| Роль | Клас | Де |
|---|---|---|
| Назва продукту | `text-base font-semibold` + `BrandMark` | шапка, над карткою входу |
| Заголовок сторінки | `text-3xl font-bold tracking-tight` | один `h1` на сторінку (`PageHeader`) |
| Заголовок розділу | `text-lg font-semibold` | `h2`: заголовок `Card`, заголовок дня на `/slots` |
| Час слоту | `text-lg font-semibold tabular-nums` | початок слоту; кінець — `text-xs text-muted-foreground` |
| Основний текст | `text-base` | текст, значення полів, значення `DescriptionList` (`font-medium`) |
| Рядки списків, повідомлення | `text-sm` | `ListItem`, `Alert` |
| Підпис поля, текст кнопки | `text-sm font-medium` / `text-sm font-semibold` | `Label`, `Button` |
| Бейдж, підпис значення в рядку | `text-xs font-semibold` / `text-xs text-muted-foreground` | статус, `dt` у рядку клієнта |
| Підпис, допоміжний текст | `text-sm text-muted-foreground` | підпис під `h1`, порожні стани, `dt`, «Not provided» |
| Дата й час | `tabular-nums` | слоти, «Held until», дата народження |

## 4. Відступи, радіуси, тінь

- Кроки Tailwind `1`, `2`, `3`, `4`, `6`, `8` (4–32px), інших немає. Рядок списку — `px-4 py-3`; клітинка таблиці —
  `px-3 py-2`; між полями форми — `gap-4`; між секціями й бічні поля — `gap-6`, `px-6`; верх і низ сторінки — `py-8`;
  усередині `Card` — `p-6`.
- Висота елементів керування одна: поле, `Select`, `Choice` і кнопка — `h-10` (40px; поле `px-3`, кнопка `px-4`), тож
  поля й кнопка стоять в один ряд (фільтр на `/slots`); у рядку списку й у шапці — `h-8` (`Button` і `Select`
  `size="sm"`, `NavLink`).
- Розміри — не відступи, тож кроки вище до них не застосовні: висоти `h-8`/`h-10`, коло аватара `size-8`/`size-12`, коло
  іконки `size-10`, колонка часу слоту `w-20`, вибір клієнта в рядку слоту `sm:w-56`, сітка підписів у рядку клієнта
  `sm:w-96`, плитки `LinkCard` — від `18rem` (`auto-fit`), колонки фільтра `20rem`/`14rem`.
- Вміст — одна колонка `max-w-5xl` (1024px): списки й розклад дихають, контакт не переноситься; форма з розділами в
  `Card` — `max-w-xl` (576px); вхід і «доступу ще немає» — `max-w-sm` (384px) по центру (`AuthShell`).
- Радіуси (`@theme`): `rounded-sm` (8px) — кнопки, поля, `Choice`, пункт навігації, знак продукту; `rounded-md` (12px)
  — `Card`, `List`, `Alert`, `LinkCard`, `EmptyState`, таблиця; `rounded-full` — бейджі, аватари, кола іконок.
- Тінь — лише `shadow-card` на поверхнях (`Card`, `List`, `LinkCard`, `EmptyState`, таблиця), разом із рамкою 1px
  `border`. Кнопки, поля й бейджі — без тіні.
- Вузький екран (< 640px): розділи шапки — другим рядком, аватар і ім'я в шапці — з `sm`/`md`; рядок списку переносить
  частини (дія слоту — на всю ширину під часом), горизонтальної прокрутки немає.

## 5. Компоненти й варіанти

Лише з `@/components/ui`. Компоненти не приймають `className`: вигляд — лише через варіанти, щоб сторінка не
перефарбувала компонент. Новий варіант чи компонент — у `src/components/ui` на токенах, з рядком у цій таблиці.

| Компонент | Варіанти | Правило |
|---|---|---|
| `Button` | `primary`, `secondary`, `ghost`; `size`: `md` (h-10), `sm` (h-8) | `primary` — одна основна дія на екран («Create client», «Sign in»); `secondary` — «Show», «Cancel», дії в рядках («Hold», «Confirm»); `ghost` — тихі дії без рамки («Sign out», кроки днями). Під час надсилання — текст стану («Creating…») і `disabled` |
| `ButtonLink` (у `button.tsx`) | ті самі, що `Button` | перехід, що виглядає як кнопка: «New client» (`primary`), «Cancel», кроки днями «‹ Mon 26 · Wed 28 ›» (`ghost`) |
| `Input` + `Label` | — | `Label` обгортає поле (`<Label>Email<Input … /></Label>`) — зв'язок без `htmlFor`; placeholder не замість підпису; обов'язкові поля — `required` (форми `noValidate`, перевіряє сервер) |
| `Select` | `size`: `md`, `sm` | той самий вигляд, що `Input`; `sm` — у рядку списку поруч із `Button sm` |
| `Choice` | — | радіокнопка в рамці для 2–3 варіантів замість `Select` («Adult» / «Child»); групу обгортає `<fieldset>` з `<legend>`; обраний — рамка `primary` і тло `primary-soft` |
| `Card` | `title` | поверхня розділу: `card`, рамка, `shadow-card`, `p-6`; заголовок — `h2` |
| `List` + `ListItem` | — | список рядків на поверхні з роздільниками — розклад дня, клієнти; `aria-labelledby` на заголовок, що його називає; рядок переносить частини на вузькому екрані |
| `Table` (`TableHeader`, `TableBody`, `TableHead`, `TableCell`) | — | дані з колонками, які не вміщуються в рядок списку; зараз сторінки обходяться `List` |
| `PageHeader` | `back`, `leading`, `description`, `actions` | верх кожної сторінки застосунку: шлях назад («‹ Clients»), ведучий аватар (картка клієнта), `h1`, підпис, дії праворуч (головна — одна) |
| `DescriptionList` | `numeric`, `muted` у пункті | пари «підпис — значення» (`<dl>`) сіткою 1–3 колонки: дані картки клієнта; дата — `numeric`, відсутнє («Not provided») — `muted` |
| `Badge` | `held`, `confirmed`, `muted` (з крапкою); `neutral` | статус — пігулка з крапкою кольору статусу, завжди зі словом; `neutral` — ознака без статусу (тип клієнта, мова) |
| `Avatar` | `size`: `sm`, `lg` | коло з ініціалами (`initials`) на `primary-soft`; ім'я завжди поруч текстом, саме коло — `aria-hidden` |
| `BrandMark` | — | знак продукту: монограма «TS» на `primary`, `aria-hidden` (назва — поруч текстом) |
| `LinkCard` | — | розділ застосунку плиткою на головній: іконка в колі `primary-soft`, назва (`primary`) і для чого розділ; наведення — межа `input` |
| `EmptyState` | `action` | порожній список: іконка в колі `muted`, текст AC дослівно; дія — лише там, де роль має право |
| `Alert` | помилка | `role="alert"`, тло `destructive-soft`, іконка й текст дослівно з AC, над формою чи списком |
| `NavLink` | — | пункт шапки з іконкою; поточний розділ — `aria-current="page"` і тло `primary-soft`, інші — `muted-foreground`; єдиний клієнтський (`"use client"`) компонент в `ui` — потребує `usePathname` |
| Іконки (`icons.tsx`) | `SlotsIcon`, `ClientsIcon`, `SignOutIcon`, `AddIcon`, `BackIcon`, `PreviousIcon`, `NextIcon`, `AlertIcon`, `TimeIcon`, `ClientIcon` | лінійні іконки `lucide-react`, 16px, товщина 1.9, `aria-hidden`; лише цей набір і завжди поруч із підписом — сенс несе текст |

Компоненти застосунку (`AppNav` — знак і назва, розділи ролі з іконками, аватар з ім'ям і роллю, «Sign out»;
`AuthShell` — вхід і «доступу ще немає»; `ErrorMessage`; `StatusBadge`, що перетворює статус на варіант `Badge`;
`ClientCardForm`) — у `src/app/_components/` і складаються з компонентів `ui` без власних кольорів.

## 6. Стани

Тексти — дослівно з AC PM. Рядки з AC-CARD — зріз 2 (вимога PM Sofiia-pm/therapy-scheduling-spec#19), задачі 1.1 і
2.1 `impl-client-cards`.

| Стан | Як виглядає | Приклад тексту |
|---|---|---|
| Порожній список | `EmptyState` замість списку: іконка в колі й одне-два речення | «No clients yet. Clients appear here when a scheduler holds a slot with you.» (AC-CARD-09) |
| Немає вільних слотів | `text-sm text-muted-foreground` над списком дня | «No free slots on this day.» (AC-HOLD-24) |
| Помилка дії | `Alert` над формою; введене лишається у формі, запису немає | «Enter the guardian's name and a valid email.» (AC-CARD-03), «This slot is no longer available.» (AC-HOLD-03) |
| Відмова в доступі | сторінка лише з `PageHeader` і `Alert`, без даних | «You don't have access to this client.» (AC-CARD-05), «Only schedulers and admins can create client cards.» (AC-CARD-06) |
| Без ролі | `AuthShell` з повідомленням як `h1`, без навігації й даних | «Your account has no access yet. Contact an administrator.» (AC-CARD-11) |
| Не увійшов | перенаправлення на сторінку входу | — (AC-CARD-07) |
| Завантаження | сторінки рендеряться на сервері; окремого індикатора немає; форма під час надсилання — текст кнопки «Creating…» | — |
| Успіх | повернення на ту саму сторінку з новим рядком у списку (чи перехід на нову картку); окремого повідомлення немає | — |
| Недоступна дія | кнопку не показуємо (не `disabled`) | — |

## 7. Доступність — мінімум

- `Label` у кожного поля (обгортає поле); помилка форми — `Alert` з `role="alert"`.
- Видимий фокус: суцільне кільце `ring` 2px з відступом 2px на кожному інтерактивному елементі
  (`:focus-visible` у `globals.css`); Tab проходить форму по порядку; поля іншого типу клієнта сховані `display: none`
  і не досяжні Tab.
- Контраст — таблиця в розділі 2, обидві теми.
- Статус ніколи не лише кольором — бейдж завжди зі словом; іконка ніколи не замість підпису (`aria-hidden`).
- Спершу семантичний HTML (`<button>`, `<ul>`, `<label>`, `<dl>`, `<fieldset>`); `aria-*` — там, де HTML бракує.

## 8. Do / Don't

| ✅ Робимо | ❌ Не робимо |
|---|---|
| `bg-primary text-primary-foreground` у `Button` | `bg-zinc-900 text-white`, `bg-[#0f766e]`, `style={{ color: "#…" }}` |
| компоненти з `@/components/ui` | власний `<button className="…">` чи `<ul className="… shadow …">` у сторінці |
| одна `primary`-кнопка на екран | дві головні дії поруч |
| текст статусу + токени статусу | червоний чи зелений бейдж без слова; статус кольором `destructive` |
| `text-muted-foreground` для другорядного | новий відтінок сірого «лише для цієї сторінки» |
| тексти повідомлень дослівно з AC | «Error!», «Oops», вигуки, емодзі |
| іконка з `icons.tsx` поруч із підписом | іконка без підпису; імпорт `lucide-react` у сторінці |
| тінь лише `shadow-card` на поверхнях | `shadow-lg` на кнопці чи бейджі |
| перехід-дія — `ButtonLink` | `<Link className="… bg-primary …">` у сторінці |
| поля й кнопка в одному ряду однієї висоти (`h-10`) | кнопка нижча за поле поруч |
| новий токен через розділ 9 | `dark:`-класи на сторінках — темну тему дають токени |

## 9. Як додати токен

1. Опишіть токен у таблиці розділу 2: для чого, значення в обох темах, контраст; те саме — у `tokens.json` артефакту.
2. `src/app/globals.css`: `--<назва>` у `:root` і в `@media (prefers-color-scheme: dark)`.
3. `--color-<назва>: var(--<назва>);` у `@theme inline` → з'являються класи `bg-<назва>`, `text-<назва>`, `border-<назва>`
   (тінь — `--shadow-<назва>` → `shadow-<назва>`).
4. `npm run check:design` і знімок сторінки у світлій і темній темі.

## 10. Перевірка

- `npm run check:design` — жодного hex, довільного кольору, сирої палітри чи кольору в inline style поза
  `src/components/ui` і `globals.css`. CI: `.github/workflows/architecture.yml`, job «Дизайн-система: лише токени».
- Виняток — коментар `design-ok: <причина>` у тому самому рядку; кожен виняток — з реальною причиною. Зараз
  винятків немає.
- Візуально: знімки `/login`, `/` і `/clients` у світлій і темній темі (`docs/img/ws7-before-*`, `docs/img/ws7-after-*`),
  Tab по формі (`docs/img/ws7-after-login-focus-*`), контраст. Темні знімки «до» збігаються зі світлими: до ADR 0005
  темної теми не було (`color-scheme: light`).
- Візуальний цикл: кожна сторінка × роль × світла й темна тема й вузький екран (390px) — Playwright у Chrome проти
  локального Supabase; знахідки й виправлення — в описі PR. Розвиток DS (#18) — `docs/img/ws7-visual-*`; теплий
  напрям — `docs/img/ws7-warm-before-*`, `docs/img/ws7-warm-after-*`.
