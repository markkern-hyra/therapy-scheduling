# Звіт UAT — 10.11.2026

- **Застосунок:** https://therapy-scheduling-theta.vercel.app (/api/health: коміт `2da7f34`)
- **Код тестів:** `task/uat-insurance` @ `9933f54`
- **Прогін:** 10.11.2026, 02:22 (Київ), Playwright 28.5 с; AC: 6 — PASS 6, FAIL 0, NEEDS-HUMAN 0
- **Рецензент:** `claude-haiku-5-5`; суперечки → `claude-sonnet-5-5`. Разом за розбір: $0.0161 (ціни API; за підпискою — у межах ліміту плану)
- **Прибирання:** синтетичних uat-*@example.test видалено 6, лишилось 0, їхніх рядків, що лишились: 0
- **Відео й траси:** не в git — `test-results/` локально або артефакт CI; трасу відкриває `npx playwright show-trace <trace.zip>`

| AC | Перевірки | Агент | Підсумок | Чому | Playwright | Розбір |
|---|---|---|---|---|---|---|
| AC-INS-01 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 2.3 с | $0.0027, 9.3 с |
| AC-INS-02 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 4.0 с | $0.0031, 9.4 с |
| AC-INS-03 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 4.5 с | $0.0031, 8.6 с |
| AC-INS-04 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 2.3 с | $0.0022, 8.1 с |
| AC-INS-05 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 3.0 с | $0.0022, 7.7 с |
| AC-INS-06 | пройшли | Haiku: PASS | **PASS** | R6: перевірки, агент і цитати збігаються | 2.1 с | $0.0029, 10.3 с |

## AC-INS-01 — PASS

**Тест:** AC-INS-01: статус ще ніхто не позначав — у картці «Insurance: Not set»

**Критерій** (requirements/33-planuvalnyk-poznachaie-status-perevirky.md):

> AC-INS-01: Дано картку client6 створено, і статус перевірки страхування ще ніхто не позначав. Коли scheduler1 відкриває картку client6. Тоді в картці показано «Insurance: Not set».

![Кадр «Тоді» 1](frames/AC-INS-01-then-1.png)

**Кроки:** ✔ Дано: картку client6 створено, і статус перевірки страхування ще ніхто не позначав → ✔ Коли: scheduler1 відкриває картку client6 → ✔ Тоді: в картці показано «Insurance: Not set»

**Агент (claude-haiku-5-5, PASS):** На кадрі frame-then-1.png сторінка картки Client Six (URL /clients/e0e54208-…): у шапці видно «Scheduler One», у розділі Insurance — точний рядок «Insurance: Not set», а нижче порожні опції статусу без вибору. Усі три видимі частини «Тоді» збігаються посимвольно; частина про базу не з кадрів і не оцінювалась.

**Цитати агента, звірені зі сторінкою (aria):**
- «Scheduler One» — є на сторінці
- «Client Six» — є на сторінці
- «Insurance: Not set» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/insurance-планувальник-і-а-d9c0f--картці-«Insurance-Not-set»-chromium/video.webm` · **траса:** `test-results/artifacts/insurance-планувальник-і-а-d9c0f--картці-«Insurance-Not-set»-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-01 — …») · @login: ____

## AC-INS-02 — PASS

**Тест:** AC-INS-02: scheduler1 позначає «Verified» — «Insurance status saved.», і після повторного відкриття «Insurance: Verified»

**Критерій** (requirements/33-planuvalnyk-poznachaie-status-perevirky.md):

> AC-INS-02: Дано картка client6 показує «Insurance: Not set». Коли scheduler1 позначає статус перевірки страхування «Verified». Тоді scheduler1 бачить повідомлення «Insurance status saved.», а картка client6 показує «Insurance: Verified» і після того, як scheduler1 відкриє її знову.

![Кадр «Тоді» 1](frames/AC-INS-02-then-1.png)
![Кадр «Тоді» 2](frames/AC-INS-02-then-2.png)

**Кроки:** ✔ Дано: картка client6 показує «Insurance: Not set» → ✔ Коли: scheduler1 позначає статус перевірки страхування «Verified» → ✔ Тоді: scheduler1 бачить повідомлення «Insurance status saved.», а картка client6 показує «Insurance: Verified» → ✔ Коли: scheduler1 відкриває картку client6 знову → ✔ Тоді: картка client6 показує «Insurance: Verified» і після того, як scheduler1 відкриє її знову

**Агент (claude-haiku-5-5, PASS):** На кадрі 1 видно зелене повідомлення «Insurance status saved.» і рядок «Insurance: Verified», радіокнопка «Verified» вибрана. На кадрі 2 (картка відкрита знову) у шапці «Scheduler One», рядок «Insurance: Verified» на місці, а повідомлення про збереження немає. Частину «у базі статус — verified» не оцінював, бо вона не з кадрів.

**Цитати агента, звірені зі сторінкою (aria):**
- «Insurance status saved.» — є на сторінці
- «Insurance: Verified» — є на сторінці
- «Scheduler One» — є на сторінці
- «Insurance: Verified» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/insurance-планувальник-і-а-20fd7-криття-«Insurance-Verified»-chromium/video.webm` · **траса:** `test-results/artifacts/insurance-планувальник-і-а-20fd7-криття-«Insurance-Verified»-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-02 — …») · @login: ____

## AC-INS-03 — PASS

**Тест:** AC-INS-03: admin1 змінює статус на «Private pay» — і admin1, і scheduler2 бачать «Insurance: Private pay»

**Критерій** (requirements/33-planuvalnyk-poznachaie-status-perevirky.md):

> AC-INS-03: Дано картка client7 показує «Insurance: Verified». Коли admin1 змінює статус перевірки страхування на «Private pay», а потім scheduler2 відкриває картку client7. Тоді і admin1, і scheduler2 бачать у картці «Insurance: Private pay».

![Кадр «Тоді» 1](frames/AC-INS-03-then-1.png)
![Кадр «Тоді» 2](frames/AC-INS-03-then-2.png)

**Кроки:** ✔ Дано: картка client7 показує «Insurance: Verified» → ✔ Коли: admin1 змінює статус перевірки страхування на «Private pay» → ✔ Тоді: і admin1, і scheduler2 бачать у картці «Insurance: Private pay» → ✔ Коли: а потім scheduler2 відкриває картку client7 → ✔ Тоді: і admin1, і scheduler2 бачать у картці «Insurance: Private pay»

**Агент (claude-haiku-5-5, PASS):** На обох кадрах сторінка клієнта Client Seven (той самий URL). На кадрі 1 у шапці «Admin One», а в блоці Insurance видно «Insurance: Private pay» і зелене «Insurance status saved.». На кадрі 2 у шапці «Scheduler Two», у блоці Insurance — «Insurance: Private pay». Статус у базі не з кадрів, не оцінюю.

**Цитати агента, звірені зі сторінкою (aria):**
- «Admin One» — є на сторінці
- «Insurance: Private pay» — є на сторінці
- «Scheduler Two» — є на сторінці
- «Insurance: Private pay» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/insurance-планувальник-і-а-104a2-ать-«Insurance-Private-pay»-chromium/video.webm` · **траса:** `test-results/artifacts/insurance-планувальник-і-а-104a2-ать-«Insurance-Private-pay»-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-03 — …») · @login: ____

## AC-INS-04 — PASS

**Тест:** AC-INS-04: therapist1 бачить «Insurance: Not accepted» свого клієнта, змінити статус йому не запропоновано

**Критерій** (requirements/33-planuvalnyk-poznachaie-status-perevirky.md):

> AC-INS-04: Дано client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted». Коли therapist1 відкриває картку client6. Тоді він бачить «Insurance: Not accepted», а змінити статус перевірки страхування в картці йому не запропоновано.

![Кадр «Тоді» 1](frames/AC-INS-04-then-1.png)

**Кроки:** ✔ Дано: client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted» → ✔ Коли: therapist1 відкриває картку client6 → ✔ Тоді: він бачить «Insurance: Not accepted», а змінити статус перевірки страхування в картці йому не запропоновано

**Агент (claude-haiku-5-5, PASS):** На кадрі видно сторінку клієнта Client Six у шапці з «Therapist One», картку Insurance з текстом «Insurance: Not accepted». Під цим рядком немає ні вибору статусу, ні кнопки «Save insurance status», тож частина про відсутність пропозиції зміни виконується. Для третьої частини цитата — весь текст картки страхування, бо на кадрі немає тексту, який би позначав відсутність елементів.

**Цитати агента, звірені зі сторінкою (aria):**
- «Therapist One» — є на сторінці
- «Insurance: Not accepted» — є на сторінці
- «Insurance» — є на сторінці
- «Insurance: Not accepted» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/insurance-терапевт-AC-INS--f4e52-татус-йому-не-запропоновано-chromium/video.webm` · **траса:** `test-results/artifacts/insurance-терапевт-AC-INS--f4e52-татус-йому-не-запропоновано-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-04 — …») · @login: ____

## AC-INS-05 — PASS

**Тест:** AC-INS-05: therapist1 напряму, в обхід сторінок, не змінює статус — scheduler1 бачить «Insurance: Not accepted»

**Критерій** (requirements/33-planuvalnyk-poznachaie-status-perevirky.md):

> AC-INS-05: Дано client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted». Коли therapist1 напряму, оминаючи сторінки застосунку, пробує змінити статус перевірки страхування client6 на «Verified». Тоді статус не змінився: scheduler1 у картці client6 бачить «Insurance: Not accepted».

![Кадр «Тоді» 1](frames/AC-INS-05-then-1.png)

**Кроки:** ✔ Дано: client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted» → ✔ Коли: therapist1 напряму, оминаючи сторінки застосунку, пробує змінити статус перевірки страхування client6 на «Verified» → ✔ Коли: scheduler1 відкриває картку client6 → ✔ Тоді: статус не змінився: scheduler1 у картці client6 бачить «Insurance: Not accepted»

**Агент (claude-haiku-5-5, PASS):** На кадрі frame-then-1.png сторінка картки Client Six (/clients/abca5130-…) з шапкою «Scheduler One» (роль Scheduler) і рядком «Insurance: Not accepted» у блоці Insurance. Вибраний радіобатон «Not accepted», а не «Verified», що узгоджується з очікуваним незміненим статусом. Обидві видимі частини «Тоді» підтверджені дослівно; внутрішні перевірки (403, 0 рядків, база) за межами кадрів не оцінювались.

**Цитати агента, звірені зі сторінкою (aria):**
- «Scheduler One» — є на сторінці
- «Insurance: Not accepted» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/insurance-терапевт-AC-INS--b4f8c-ть-«Insurance-Not-accepted»-chromium/video.webm` · **траса:** `test-results/artifacts/insurance-терапевт-AC-INS--b4f8c-ть-«Insurance-Not-accepted»-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-05 — …») · @login: ____

## AC-INS-06 — PASS

**Тест:** AC-INS-06: без входу картка за прямим посиланням — лише сторінка входу, а scheduler1 бачить «Insurance: Verified»

**Критерій** (requirements/33-planuvalnyk-poznachaie-status-perevirky.md):

> AC-INS-06: Дано користувач не увійшов у застосунок, а картка client6 показує «Insurance: Verified». Коли він відкриває картку client6 за прямим посиланням. Тоді він бачить лише сторінку входу, статусу страхування й інших даних client6 не показано, а scheduler1 після цього бачить у картці client6 «Insurance: Verified».

![Кадр «Тоді» 1](frames/AC-INS-06-then-1.png)
![Кадр «Тоді» 2](frames/AC-INS-06-then-2.png)

**Кроки:** ✔ Дано: користувач не увійшов у застосунок, а картка client6 показує «Insurance: Verified» → ✔ Коли: він відкриває картку client6 за прямим посиланням → ✔ Тоді: він бачить лише сторінку входу, статусу страхування й інших даних client6 не показано → ✔ Коли: scheduler1 після цього відкриває картку client6 → ✔ Тоді: scheduler1 після цього бачить у картці client6 «Insurance: Verified»

**Агент (claude-haiku-5-5, PASS):** На frame-then-1.png видно сторінку входу «Sign in» з полями «Email», «Password» і кнопкою «Sign in»; рядка «Insurance: …» та імені Client Six на кадрі немає. Для частини про відсутність даних цитата — сам текст входу, бо саме він є на екрані. На frame-then-2.png після входу як Scheduler One видно шапку «Scheduler One» і рядок «Insurance: Verified» у картці Client Six. Частину про пряме посилання/URL і стан у базі не оцінював (не з кадрів).

**Цитати агента, звірені зі сторінкою (aria):**
- «Sign in» — є на сторінці
- «Email» — є на сторінці
- «Password» — є на сторінці
- «Sign in» — є на сторінці
- «Sign in» — є на сторінці
- «Scheduler One» — є на сторінці
- «Insurance: Verified» — є на сторінці

**Правило:** R6: перевірки, агент і цитати збігаються

**Відео:** `test-results/artifacts/insurance-планувальник-і-а-0b57c-бачить-«Insurance-Verified»-chromium/video.webm` · **траса:** `test-results/artifacts/insurance-планувальник-і-а-0b57c-бачить-«Insurance-Verified»-chromium/trace.zip` (не в git)

**Рішення PM:** ☐ приймаю · ☐ відхилення від вимог (issue «Відхилення від вимог: AC-INS-06 — …») · @login: ____

## Як читати підсумок

- **PASS** — автоматичні перевірки пройшли, агент-рецензент погодився з кадром, а кожну його цитату знайдено на сторінці.
- **FAIL** — впала автоматична перевірка. Агент цього не перекриває: невидимі вади (буфер обміну, база) він на кадрі не побачить.
- **NEEDS-HUMAN** — перевірки зелені, але агент не погодився або його цитати немає на сторінці. Часто це слабкий тест або розбіжність між текстом AC і тестом — питання до PM, а не обов'язково вада продукту.

Правила: R1: перевірка впала — FAIL завжди, агент не перекриває; R2: немає вердикту агента або кадру; R3: перевірки пройшли, агент не погоджується — вирішує людина; R4: цитати агента немає на сторінці (aria) — не підтверджено; R5: помилка сторінки або 5xx під час сценарію; R6: перевірки, агент і цитати збігаються.
