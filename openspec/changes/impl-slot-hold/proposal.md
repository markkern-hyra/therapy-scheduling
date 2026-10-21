# Пропозиція розробника: реалізація зрізу 1 «Утримання слоту терапевта за клієнтом до підтвердження»

## Why

Специфікацію зрізу 1 (WS6) злито в `openspec/specs/` — можливості `slot-holds`, `therapist-schedule` і `clients`, переклад
вимоги Sofiia-pm/therapy-scheduling-spec#2. Ця зміна — технічний план і задачі розробника: як реалізувати зріз у
Next.js + Supabase так, щоб кожен AC мав код, тест з AC ID у назві й рядок «реалізовано» в `docs/conformance.md`.

## What Changes

Покриває всі 36 AC зрізу:

- `clients`: AC-HOLD-10, AC-HOLD-11, AC-HOLD-15, AC-HOLD-16, AC-HOLD-34, AC-HOLD-35
- `slot-holds`: AC-HOLD-01, AC-HOLD-02, AC-HOLD-03, AC-HOLD-04, AC-HOLD-05, AC-HOLD-06, AC-HOLD-07, AC-HOLD-08,
  AC-HOLD-12, AC-HOLD-13, AC-HOLD-14, AC-HOLD-17, AC-HOLD-18, AC-HOLD-19, AC-HOLD-20, AC-HOLD-22, AC-HOLD-23, AC-HOLD-24,
  AC-HOLD-25, AC-HOLD-26, AC-HOLD-27, AC-HOLD-28, AC-HOLD-29, AC-HOLD-32, AC-HOLD-33, AC-HOLD-36
- `therapist-schedule`: AC-HOLD-09, AC-HOLD-21, AC-HOLD-30, AC-HOLD-31

Технічно: ролі `admin` / `scheduler` / `therapist` замість ролей шаблону; таблиці `clients`, `slots`, `holds` з RLS і
явними GRANT; правила утримання й підтвердження — у базі (тригери з блокуванням рядків); доменний модуль
`src/lib/scheduling/` з юніт-тестами; сторінки для планувальника, адміністратора й терапевта; демо-користувачі й слоти.
Поведінку специфікації ця зміна не змінює (`skip_specs: true`).
