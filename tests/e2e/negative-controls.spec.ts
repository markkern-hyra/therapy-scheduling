// НЕГАТИВНІ КОНТРОЛІ — навмисно хибні очікування, щоб показати, що UAT уміє падати. Не AC-тести: назви починаються з NC-,
// тож ac:coverage їх не рахує. У звичайному прогоні їх немає; запуск: npm run uat:nc. Лише читання: безпечно на проді.
//   NC-1 — у тесті неправильний текст → перевірка падає → FAIL, хоч би що сказав агент (R1);
//   NC-2 — текст «Тоді» у вимозі уточнено, а тест і застосунок ні → перевірки зелені, агент звіряє кадр із новим текстом
//          і не погоджується → NEEDS-HUMAN (R3).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

test.use({ storageState: "playwright/.auth/therapist.json" });

const MESSAGE = "Only schedulers and admins can create client cards.";
const WRONG_MESSAGE = "Only admins can create client cards.";
const GIVEN = "therapist1 увійшов у застосунок";
const WHEN = "він відкриває форму нової картки клієнта за прямим посиланням";
const CLAUSE = `форму не показано, therapist1 одразу бачить повідомлення «${MESSAGE}», і кількість карток клієнтів не змінилася`;
const THEN = { clause: CLAUSE, visible: [`повідомлення «${MESSAGE}»`] };

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "NC-1 (AC-CARD-06, навмисно хибне очікування в тесті: інший текст повідомлення)",
  {
    tag: ["@negative-control"],
    annotation: [
      { type: "ac", description: "AC-CARD-06" },
      { type: "case", description: "NC-1" },
    ],
  },
  async ({ page }) => {
    await given(GIVEN, async () => {
      await page.goto("/");
    });
    await when(WHEN, async () => {
      await page.goto("/clients/new");
    });
    await thenStep(page, THEN, async () => {
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(WRONG_MESSAGE, { timeout: 5_000 });
    });
  },
);

test(
  "NC-2 (AC-CARD-06, текст «Тоді» у вимозі уточнено, тест і застосунок — ні)",
  {
    tag: ["@negative-control"],
    annotation: [
      { type: "ac", description: "AC-CARD-06" },
      { type: "case", description: "NC-2" },
      {
        type: "ac-text",
        description: `AC-CARD-06: Дано ${GIVEN}. Коли ${WHEN}. Тоді форму не показано, therapist1 одразу бачить повідомлення «${WRONG_MESSAGE}», і кількість карток клієнтів не змінилася.`,
      },
    ],
  },
  async ({ page }) => {
    await given(GIVEN, async () => {
      await page.goto("/");
    });
    await when(WHEN, async () => {
      await page.goto("/clients/new");
    });
    await thenStep(page, THEN, async () => {
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(MESSAGE);
    });
  },
);
