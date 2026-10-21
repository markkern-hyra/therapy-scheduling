# Сторонні скіли: джерела й ліцензії

Копії без змін (байт у байт) зі зафіксованих комітів. Оновлювати лише новою копією з іншого коміту, прочитавши вміст, і
з оновленим SHA тут. Коли й навіщо їх використовувати — `AGENTS.md`, розділ «Скіли розробки: ponytail і superpowers».

## ponytail — https://github.com/DietrichGebert/ponytail

Коміт `09c434ab73ca43761c5d8b0c5d341926c2fba710` (MIT, © 2026 DietrichGebert).

- `ponytail/SKILL.md` ← `skills/ponytail/SKILL.md`

Не взято: плагін Claude Code з хуками (SessionStart, UserPromptSubmit, ledger у `~/.config` і вебхук), команди й
допоміжні скіли `ponytail-*`.

## superpowers — https://github.com/obra/superpowers

Коміт `b739a8af570e10a95898f2bdf6cec97467fa6c12` (MIT, © 2025 Jesse Vincent).

- `using-superpowers/SKILL.md`, `using-superpowers/references/claude-code-tools.md`
- `test-driven-development/SKILL.md`, `test-driven-development/writing-good-tests.md`
- `systematic-debugging/SKILL.md`, `root-cause-tracing.md`, `defense-in-depth.md`, `condition-based-waiting.md`,
  `find-polluter.sh`
- `verification-before-completion/SKILL.md`
- `receiving-code-review/SKILL.md`
- `requesting-code-review/SKILL.md`, `requesting-code-review/code-reviewer.md`

Шлях у джерелі — `skills/<те саме>`. Не взято: плагін із хуком SessionStart; скіли `brainstorming`, `writing-plans`,
`executing-plans`, `finishing-a-development-branch`, `using-git-worktrees`, `subagent-driven-development`,
`dispatching-parallel-agents`, `writing-skills`, `diagnosing-superpowers` (їх замінює процес OpenSpec і PR цього репо);
`systematic-debugging/condition-based-waiting-example.ts` (на нього посилається `condition-based-waiting.md`: файл .ts
підхопили б `tsc` і ESLint проєкту), `CREATION-LOG.md` і `test-*.md` (тести самого скіла); довідки
`using-superpowers/references/` для інших агентів, крім Claude Code.

## Ліцензії

### ponytail

```text
MIT License

Copyright (c) 2026 DietrichGebert

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### superpowers

```text
MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
