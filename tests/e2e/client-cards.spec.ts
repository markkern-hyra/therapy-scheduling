// AC-CARD-06, 12, 16 у браузері. Лише читання, безпечно на проді: у AC-CARD-12 дія відхиляє форму ще до запису в базу.
import { expect, test, type Page, type PlaywrightWorkerArgs } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

const SCHEDULER = "playwright/.auth/scheduler.json";
const THERAPIST = "playwright/.auth/therapist.json";
const MISSING_CARD = "/clients/00000000-0000-4000-8000-000000000000";

// Картки — зі списку планувальника (він бачить усі, AC-CARD-10): HTTP-запит, бо браузер записав би зайве відео.
async function clientCardLinks(playwright: PlaywrightWorkerArgs["playwright"], baseURL: string | undefined): Promise<string[]> {
  const scheduler = await playwright.request.newContext({ baseURL, storageState: SCHEDULER });
  const response = await scheduler.get("/clients");
  expect(response.ok(), "список клієнтів недоступний: кількість карток не доведено").toBe(true);
  expect(new URL(response.url()).pathname, "сесія планувальника недійсна: сторінка входу замість списку").toBe("/clients");
  const links = (await response.text()).match(/\/clients\/[0-9a-f-]{36}/g);
  await scheduler.dispose();
  return [...new Set<string>(links)];
}

async function expectNoClientData(page: Page) {
  const main = page.getByRole("main");
  await expect(main.getByText("Intake")).toHaveCount(0);
  await expect(main.locator("dl")).toHaveCount(0);
  await expect(main.locator('a[href^="/clients/"]')).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toContain("@example.test");
}

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test.describe("терапевт", () => {
  test.use({ storageState: THERAPIST });

  test(
    "AC-CARD-06: терапевт за прямим посиланням не бачить форми, бачить відмову, кількість карток та сама",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-CARD-06" } },
    async ({ page, playwright, baseURL }) => {
      let cardsBefore: string[] = [];

      await given("therapist1 увійшов у застосунок", async () => {
        await page.goto("/");
        await expect(page.getByTestId("user-name")).toHaveText("Therapist One");
        cardsBefore = await clientCardLinks(playwright, baseURL);
      });

      await when("він відкриває форму нової картки клієнта за прямим посиланням", async () => {
        await page.goto("/clients/new");
      });

      await thenStep(
        page,
        {
          clause:
            "форму не показано, therapist1 одразу бачить повідомлення «Only schedulers and admins can create client cards.», і кількість карток клієнтів не змінилася",
          visible: ["у шапці — Therapist One", "повідомлення «Only schedulers and admins can create client cards.»"],
          hidden: [
            "форму не показано: у розмітці немає форми, полів і кнопки «Create client»",
            "кількість карток клієнтів та сама до й після: список планувальника",
          ],
        },
        async () => {
          const main = page.getByRole("main");
          await expect(main.getByRole("alert")).toHaveText("Only schedulers and admins can create client cards.");
          await expect(main.locator("form")).toHaveCount(0);
          await expect(main.getByRole("textbox")).toHaveCount(0);
          await expect(main.getByRole("button", { name: "Create client" })).toHaveCount(0);
          expect(await clientCardLinks(playwright, baseURL)).toHaveLength(cardsBefore.length);
        },
      );
    },
  );
});

test.describe("планувальник", () => {
  test.use({ storageState: SCHEDULER });

  test(
    "AC-CARD-12: кілька помилок у формі — одразу три повідомлення біля полів, картку не створено, введене лишається",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-CARD-12" } },
    async ({ page, playwright, baseURL }) => {
      // AC дає «сьогодні 2026-11-03» і завтрашню дату: рахуємо за годинником практики, незалежно від коду застосунку.
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
      const tomorrow = new Date(Date.parse(today) + 86_400_000).toISOString().slice(0, 10);
      const nameError = "Enter the client's name.";
      const birthDateError = "Enter a date of birth that is not in the future.";
      const languageError = "Select a session language.";
      const fullName = page.getByLabel("Full name");
      const birthDate = page.getByLabel("Date of birth");
      const language = page.getByLabel("Session language");
      const childType = page.getByRole("radio", { name: "Child" });
      const guardianName = page.getByLabel("Guardian name");
      const guardianEmail = page.getByLabel("Guardian email");
      let cardsBefore: string[] = [];

      await given(`сьогодні ${today}`, async () => {
        cardsBefore = await clientCardLinks(playwright, baseURL);
        await page.goto("/clients/new");
        await expect(page.getByTestId("user-name")).toHaveText("Scheduler One");
      });

      await when(
        `scheduler1 створює картку з типом «Child», порожнім ім'ям, датою народження ${tomorrow}, без мови сеансів, з ім'ям опікуна «Guardian Eight» і email опікуна guardian8@example.test`,
        async () => {
          await childType.check();
          await birthDate.fill(tomorrow);
          await guardianName.fill("Guardian Eight");
          await guardianEmail.fill("guardian8@example.test");
          await page.getByRole("button", { name: "Create client" }).click();
        },
      );

      await thenStep(
        page,
        {
          clause:
            "картку не створено, scheduler1 одразу бачить три повідомлення біля відповідних полів — «Enter the client's name.», «Enter a date of birth that is not in the future.» і «Select a session language.», а всі введені дані лишаються у формі",
          visible: [
            `повідомлення «${nameError}» під полем «Full name»`,
            `повідомлення «${birthDateError}» під полем «Date of birth»`,
            `повідомлення «${languageError}» під полем «Session language»`,
            "у формі лишились тип «Child», ім'я опікуна «Guardian Eight» і email опікуна «guardian8@example.test»",
          ],
          hidden: [
            `кожне повідомлення зв'язане зі своїм полем (aria-describedby), у полі дати народження лишилось ${tomorrow}: браузер показує дату у власному форматі`,
            "картку не створено: кількість карток та сама, сторінка лишилась /clients/new",
          ],
        },
        async () => {
          // Єдине твердження, що чекає на відповідь сервера: при retries: 0 повільний прод не має давати хибний FAIL.
          await expect(page.getByRole("main").getByRole("alert")).toHaveText([nameError, birthDateError, languageError], {
            timeout: 15_000,
          });
          await expect(fullName).toHaveAccessibleDescription(nameError);
          await expect(birthDate).toHaveAccessibleDescription(birthDateError);
          await expect(language).toHaveAccessibleDescription(languageError);
          await expect(childType).toBeChecked();
          await expect(fullName).toHaveValue("");
          await expect(birthDate).toHaveValue(tomorrow);
          await expect(language).toHaveValue("");
          await expect(guardianName).toHaveValue("Guardian Eight");
          await expect(guardianEmail).toHaveValue("guardian8@example.test");
          await expect(page).toHaveURL(/\/clients\/new$/);
          expect(await clientCardLinks(playwright, baseURL)).toHaveLength(cardsBefore.length);
        },
      );
    },
  );

  test(
    "AC-CARD-16: неіснуюча картка — планувальник і терапевт бачать кожен свій текст і жодних даних клієнтів",
    { tag: ["@uat"], annotation: { type: "ac", description: "AC-CARD-16" } },
    async ({ page, context, playwright, baseURL }) => {
      await given("картки клієнта, на яку веде посилання, не існує", async () => {
        expect(await clientCardLinks(playwright, baseURL)).not.toContain(MISSING_CARD);
      });

      await when("scheduler1 відкриває це посилання", async () => {
        await page.goto(MISSING_CARD);
      });

      await thenStep(
        page,
        {
          clause: "scheduler1 бачить повідомлення «This client card doesn't exist.»",
          visible: ["у шапці — Scheduler One", "повідомлення «This client card doesn't exist.»"],
          hidden: ["scheduler1 не бачить жодних даних клієнтів: немає анкети й жодного email"],
        },
        async () => {
          await expect(page.getByTestId("user-name")).toHaveText("Scheduler One");
          await expect(page.getByRole("main").getByRole("alert")).toHaveText("This client card doesn't exist.");
          await expectNoClientData(page);
        },
      );

      await when("а потім therapist1 відкриває це посилання", async () => {
        await context.setStorageState(THERAPIST);
        await page.goto(MISSING_CARD);
      });

      await thenStep(
        page,
        {
          clause: "therapist1 — «You don't have access to this client.», і жоден із них не бачить жодних даних клієнтів",
          visible: ["у шапці — Therapist One", "повідомлення «You don't have access to this client.»"],
          hidden: ["therapist1 не бачить жодних даних клієнтів: немає анкети й жодного email"],
        },
        async () => {
          await expect(page.getByTestId("user-name")).toHaveText("Therapist One");
          await expect(page.getByRole("main").getByRole("alert")).toHaveText("You don't have access to this client.");
          await expectNoClientData(page);
        },
      );
    },
  );
});
