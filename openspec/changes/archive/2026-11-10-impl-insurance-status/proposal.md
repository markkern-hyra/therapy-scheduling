# Пропозиція розробника: реалізація зрізу 3 — статус перевірки страхування

## Why

Зріз 3 (HryhoriiHaponiukQuitCode/therapy-scheduling-spec#33, специфікація `openspec/specs/insurance-status/spec.md`
після archive `add-insurance-status`) дає планувальнику й адміністратору позначити в картці клієнта статус перевірки
страхування, а терапевту — бачити його в картках своїх клієнтів. Ця зміна — план, як реалізувати кожен AC зрізу так, щоб
він мав код, тест з AC ID на правильному рівні, доказ, що тест відмови здатен упасти, UAT-запис на проді й рядок у
`docs/conformance.md`.

## What Changes

Покриває AC:

- `insurance-status`: AC-INS-01, AC-INS-02, AC-INS-03, AC-INS-04, AC-INS-05, AC-INS-06

Поведінку специфікації ця зміна не змінює (`skip_specs: true`).
