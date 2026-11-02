# Design: impl-client-cards-2

## Context

- Специфікація: `openspec/specs/clients/spec.md` і `openspec/specs/access/spec.md` після `clarify-client-cards`.
- Що вже є: `private.is_own_client` (ADR 0007), check-обмеження анкети (ADR 0003, міграція `client_cards`),
  `createClientCard`, `ClientCardForm`, `emptyClientsText`, `requireRole`, тести бази на PGlite (`tests/db`).
- Зауваження викладача до WS7: перевірка ролі в «own»-гілках політик `slots` і `holds`; `validateCard` і
  `missingCardText` як чисті функції з тестами.

## Goals / Non-Goals

**Goals:** кожен AC зі списку `proposal.md` — код, тест, рядок матриці; на зміну правил у базі — тест бази й мутація.

**Non-Goals:** розклад терапевта й підтвердження (`impl-slot-hold`), пошук у самому списку клієнтів (поза межами PM).

## Decisions

### 1. «Свій клієнт» — нова міграція, а не правка застосованої (AC-CARD-04, 08, 14)

`create or replace function private.is_own_client`: утримання рахується, якщо
`h.confirmed_at is not null or (now() < h.expires_at and s.starts_at > now())`. Загальний `private.is_active_hold` не
міняємо: його використовують тригери й політика `holds_select_staff_or_own_active`, а розклад за припущенням PM показує
«Held» до прострочення.

### 2. Без ролі — жодних даних і прямим запитом (AC-CARD-11)

У тій самій міграції «own»-гілки `slots_select_staff_or_own` і `holds_select_staff_or_own_active` отримують
`(select private.has_role('therapist')) and`. Для `clients` це правило вже діє.

### 3. Форма перевіряється в TypeScript, база лишається арбітром (AC-CARD-12; ADR 0009)

Check зупиняється на першому порушенні, а PM вимагає всі помилки одразу. Чиста `validateCard(values, today)` повертає
`{ поле: MessageCode }`, дія викликає її до запису. Обмеження в базі лишаються захистом від прямого запиту. Тип клієнта
більше не вибрано наперед, щоб «Select a client type.» була досяжною. Спільне повідомлення пари полів (ім'я й email
дорослого, ім'я й email опікуна) показуємо один раз, під першим полем із помилкою.

### 4. Дублікат дитини — частковий унікальний індекс (AC-CARD-13)

`create unique index clients_child_dedup_key on public.clients (lower(btrim(full_name)), birth_date, guardian_email)
where kind = 'child'`. Індекс, а не перевірка в коді: два одночасні збереження інакше створять дублікат. Назва індексу
додається в `CONSTRAINTS` у `messages.ts`.

### 5. Тексти за роллю — чисті функції (AC-CARD-15, 16)

`emptyClientsText(role)` і `missingCardText(role)`. Планувальник і адміністратор відрізняють «немає картки» лише тому, що
бачать усі картки: для терапевта 0 рядків завжди дає текст відмови, тож перебором посилань нічого не дізнатися. Для
неіснуючої картки застосунок не робить окремого запиту.

### 6. Пошук клієнта під час утримання — поле у фільтрі `/slots` (AC-CARD-02)

Параметр `?client=` і чиста `matchesClient(client, query)`: ім'я або контактний email без урахування регістру й пробілів
по краях. Для дитини контакт — email опікуна. Запит не потрібен: сторінка вже читає всіх клієнтів, а вибір у рядку слота
показує лише знайдених.

## UI і компоненти

| Що | Рішення | AC |
|---|---|---|
| Помилка поля | новий `FieldError` у `src/components/ui`, рядок у `DESIGN.md`, розділ 5: `text-sm text-destructive`, `role="alert"` | AC-CARD-12 |
| Форма картки | `FieldError` під полем; `Alert` над формою лише для відмов бази | AC-CARD-12, 13 |
| Порожній список | `EmptyState` з текстом за роллю | AC-CARD-15 |
| Неіснуюча картка | `PageHeader` і `Alert` з текстом за роллю | AC-CARD-16 |

## Risks / Trade-offs

- `validateCard` повторює правило email зі SQL. Шкода обмежена: якщо TS пропустить, відмовить база; тести перевіряють обидва.
- Частковий індекс може не створитися, якщо на проді вже є дублікати дітей. Перед злиттям міграції запит на дублікати.
