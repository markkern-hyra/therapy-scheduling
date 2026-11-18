# Пропозиція розробника: реалізація зрізу 4 — чернетка картки клієнта з тексту звернення

## Why

Зріз 4 (HryhoriiHaponiukQuitCode/therapy-scheduling-spec#36, специфікація `openspec/specs/client-intake-draft/spec.md`
після archive `add-client-intake-draft`) — перша AI-функція продукту: помічник складає з тексту звернення чернетку
форми нової картки, а картку створює лише людина. Ця зміна — план, як реалізувати кожен AC зрізу так, щоб він мав код,
тест з AC ID на рівні з таблиці «Як доводимо» PM, офлайн-реплей golden cases на справжніх записах моделі, один звіт
живого прогону, UAT-запис на проді й рядок у `docs/conformance.md`.

## What Changes

Покриває AC:

- `client-intake-draft`: AC-INTAKE-01, AC-INTAKE-02, AC-INTAKE-03, AC-INTAKE-04, AC-INTAKE-05, AC-INTAKE-06,
  AC-INTAKE-07, AC-INTAKE-08, AC-INTAKE-09

Поведінку специфікації ця зміна не змінює (`skip_specs: true`).
