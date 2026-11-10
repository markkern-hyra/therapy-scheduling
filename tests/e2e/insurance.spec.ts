// AC-INS-01…06 (зріз 3, статус перевірки страхування) у браузері. Прод спільний з PM: кожен тест працює лише з власною
// синтетичною карткою uat-<запуск>-…@example.test (@writes) і прибирає її після себе (afterAll і cleanup.teardown.ts);
// картки PM не змінюються. «Дано» ставить секретний ключ (tests/e2e/support/admin.ts), «свого клієнта» — утримання
// від імені scheduler1.
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  createUatClient,
  deleteUatClients,
  holdUatClientWith,
  setUatInsurance,
  uatInsuranceOf,
} from "./support/admin";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

const SCHEDULER = "playwright/.auth/scheduler.json";
const SCHEDULER2 = "playwright/.auth/scheduler2.json";
const THERAPIST = "playwright/.auth/therapist.json";
const ADMIN = "playwright/.auth/admin.json";
const SIGNED_OUT = { cookies: [], origins: [] };
const TAGS = { tag: ["@uat", "@writes"] };
const ac = (id: string) => ({ ...TAGS, annotation: { type: "ac", description: id } });

const card = (id: string) => `/clients/${id}`;
const main = (page: Page) => page.getByRole("main");
const statusLine = (page: Page, text: string) => main(page).getByText(text, { exact: true });

async function openAs(page: Page, context: BrowserContext, state: string, id: string, name: string) {
  await context.setStorageState(state);
  await page.goto(card(id));
  await expect(page.getByTestId("user-name")).toHaveText(name);
}

// Сесія з cookie Supabase (@supabase/ssr: «base64-<json>», можливо частинами .0, .1 …) → access token — так
// терапевт іде «напряму, оминаючи сторінки застосунку» з тим самим входом, що й у браузері.
async function accessToken(context: BrowserContext): Promise<string> {
  const parts = (await context.cookies())
    .filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  const raw = parts.map((c) => c.value).join("");
  const json = raw.startsWith("base64-") ? Buffer.from(raw.slice(7), "base64").toString("utf8") : decodeURIComponent(raw);
  return (JSON.parse(json) as { access_token: string }).access_token;
}

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test.afterAll(async () => {
  expect((await deleteUatClients()).remaining, "лишились синтетичні картки клієнтів").toBe(0);
});

test.describe("планувальник і адміністратор", () => {
  test.use({ storageState: SCHEDULER });

  test(
    "AC-INS-01: статус ще ніхто не позначав — у картці «Insurance: Not set»",
    ac("AC-INS-01"),
    async ({ page }) => {
      let id = "";

      await given("картку client6 створено, і статус перевірки страхування ще ніхто не позначав", async () => {
        id = await createUatClient("ins01-client6", "Client Six");
        expect(await uatInsuranceOf(id)).toBeNull();
      });

      await when("scheduler1 відкриває картку client6", async () => {
        await page.goto(card(id));
        await expect(page.getByTestId("user-name")).toHaveText("Scheduler One");
      });

      await thenStep(
        page,
        {
          clause: "в картці показано «Insurance: Not set»",
          visible: ["у шапці — Scheduler One", "картка Client Six", "рядок «Insurance: Not set»"],
          hidden: ["статусу в базі немає: рядка client_insurance для картки немає"],
        },
        async () => {
          await expect(main(page).getByRole("heading", { level: 1 })).toHaveText("Client Six");
          await expect(statusLine(page, "Insurance: Not set")).toBeVisible();
          expect(await uatInsuranceOf(id)).toBeNull();
        },
      );
    },
  );

  test(
    "AC-INS-02: scheduler1 позначає «Verified» — «Insurance status saved.», і після повторного відкриття «Insurance: Verified»",
    ac("AC-INS-02"),
    async ({ page }) => {
      let id = "";
      const saved = () => main(page).getByRole("status").filter({ hasText: "Insurance status saved." });

      await given("картка client6 показує «Insurance: Not set»", async () => {
        id = await createUatClient("ins02-client6", "Client Six");
        await page.goto(card(id));
        await expect(statusLine(page, "Insurance: Not set")).toBeVisible();
      });

      await when("scheduler1 позначає статус перевірки страхування «Verified»", async () => {
        await main(page).getByRole("radio", { name: "Verified" }).check();
        await main(page).getByRole("button", { name: "Save insurance status" }).click();
      });

      await thenStep(
        page,
        {
          clause: "scheduler1 бачить повідомлення «Insurance status saved.», а картка client6 показує «Insurance: Verified»",
          visible: ["повідомлення «Insurance status saved.»", "рядок «Insurance: Verified»"],
          hidden: ["у базі статус картки — verified"],
        },
        async () => {
          // Єдине твердження, що чекає на відповідь сервера: повільний прод не має давати хибний FAIL.
          await expect(saved()).toBeVisible({ timeout: 15_000 });
          await expect(statusLine(page, "Insurance: Verified")).toBeVisible();
          expect(await uatInsuranceOf(id)).toBe("verified");
        },
      );

      await when("scheduler1 відкриває картку client6 знову", async () => {
        await page.goto(card(id));
      });

      await thenStep(
        page,
        {
          clause: "картка client6 показує «Insurance: Verified» і після того, як scheduler1 відкриє її знову",
          visible: ["у шапці — Scheduler One", "рядок «Insurance: Verified»"],
          hidden: ["картку відкрито знову: адреса без ?notice=, повідомлення «Insurance status saved.» немає"],
        },
        async () => {
          await expect(statusLine(page, "Insurance: Verified")).toBeVisible();
          await expect(page).toHaveURL(new RegExp(`${card(id)}$`));
          await expect(saved()).toHaveCount(0);
        },
      );
    },
  );

  test(
    "AC-INS-03: admin1 змінює статус на «Private pay» — і admin1, і scheduler2 бачать «Insurance: Private pay»",
    ac("AC-INS-03"),
    async ({ page, context }) => {
      let id = "";
      const clause = "і admin1, і scheduler2 бачать у картці «Insurance: Private pay»";

      await given("картка client7 показує «Insurance: Verified»", async () => {
        id = await createUatClient("ins03-client7", "Client Seven");
        await setUatInsurance(id, "verified");
        await openAs(page, context, ADMIN, id, "Admin One");
        await expect(statusLine(page, "Insurance: Verified")).toBeVisible();
      });

      await when("admin1 змінює статус перевірки страхування на «Private pay»", async () => {
        await main(page).getByRole("radio", { name: "Private pay" }).check();
        await main(page).getByRole("button", { name: "Save insurance status" }).click();
      });

      await thenStep(
        page,
        {
          clause,
          visible: ["у шапці — Admin One", "рядок «Insurance: Private pay»"],
          hidden: ["у базі статус картки — private_pay"],
        },
        async () => {
          await expect(statusLine(page, "Insurance: Private pay")).toBeVisible({ timeout: 15_000 });
          expect(await uatInsuranceOf(id)).toBe("private_pay");
        },
      );

      await when("а потім scheduler2 відкриває картку client7", async () => {
        await openAs(page, context, SCHEDULER2, id, "Scheduler Two");
      });

      await thenStep(
        page,
        {
          clause,
          visible: ["у шапці — Scheduler Two", "рядок «Insurance: Private pay»"],
        },
        async () => {
          await expect(statusLine(page, "Insurance: Private pay")).toBeVisible();
        },
      );
    },
  );

  test(
    "AC-INS-06: без входу картка за прямим посиланням — лише сторінка входу, а scheduler1 бачить «Insurance: Verified»",
    ac("AC-INS-06"),
    async ({ page, context }) => {
      let id = "";

      await given("користувач не увійшов у застосунок, а картка client6 показує «Insurance: Verified»", async () => {
        id = await createUatClient("ins06-client6", "Client Six");
        await setUatInsurance(id, "verified");
        await context.setStorageState(SIGNED_OUT);
      });

      await when("він відкриває картку client6 за прямим посиланням", async () => {
        await page.goto(card(id));
      });

      await thenStep(
        page,
        {
          clause: "він бачить лише сторінку входу, статусу страхування й інших даних client6 не показано",
          visible: ["сторінка входу: поля «Email» і «Password», кнопка «Sign in»", "немає рядка «Insurance: …» і імені Client Six"],
          hidden: ["адреса — /login; у розмітці немає «Insurance», «Client Six» і жодного email @example.test"],
        },
        async () => {
          await expect(page).toHaveURL(/\/login$/);
          await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
          const body = await page.locator("body").innerText();
          expect(body).not.toContain("Insurance");
          expect(body).not.toContain("Client Six");
          expect(body).not.toContain("@example.test");
        },
      );

      await when("scheduler1 після цього відкриває картку client6", async () => {
        await openAs(page, context, SCHEDULER, id, "Scheduler One");
      });

      await thenStep(
        page,
        {
          clause: "scheduler1 після цього бачить у картці client6 «Insurance: Verified»",
          visible: ["у шапці — Scheduler One", "рядок «Insurance: Verified»"],
          hidden: ["у базі статус картки — verified"],
        },
        async () => {
          await expect(statusLine(page, "Insurance: Verified")).toBeVisible();
          expect(await uatInsuranceOf(id)).toBe("verified");
        },
      );
    },
  );
});

test.describe("терапевт", () => {
  test.use({ storageState: THERAPIST });

  // «Дано» обох AC: client6 — свій клієнт therapist1 (утримання «Held»), картка показує «Insurance: Not accepted».
  async function ownClientNotAccepted(suffix: string) {
    const id = await createUatClient(suffix, "Client Six");
    await holdUatClientWith(id, "therapist1@example.test");
    await setUatInsurance(id, "not_accepted");
    return id;
  }

  test(
    "AC-INS-04: therapist1 бачить «Insurance: Not accepted» свого клієнта, змінити статус йому не запропоновано",
    ac("AC-INS-04"),
    async ({ page }) => {
      let id = "";

      await given("client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted»", async () => {
        id = await ownClientNotAccepted("ins04-client6");
      });

      await when("therapist1 відкриває картку client6", async () => {
        await page.goto(card(id));
        await expect(page.getByTestId("user-name")).toHaveText("Therapist One");
      });

      await thenStep(
        page,
        {
          clause:
            "він бачить «Insurance: Not accepted», а змінити статус перевірки страхування в картці йому не запропоновано",
          visible: ["у шапці — Therapist One", "рядок «Insurance: Not accepted»", "у картці немає вибору статусу й кнопки «Save insurance status»"],
          hidden: ["у розмітці немає форми статусу: жодної радіокнопки «Verified», «Not accepted», «Private pay»"],
        },
        async () => {
          await expect(statusLine(page, "Insurance: Not accepted")).toBeVisible();
          await expect(main(page).getByRole("radio")).toHaveCount(0);
          await expect(main(page).getByRole("button", { name: "Save insurance status" })).toHaveCount(0);
          await expect(main(page).locator("form")).toHaveCount(0);
        },
      );
    },
  );

  test(
    "AC-INS-05: therapist1 напряму, в обхід сторінок, не змінює статус — scheduler1 бачить «Insurance: Not accepted»",
    ac("AC-INS-05"),
    async ({ page, context, playwright }) => {
      let id = "";
      const rest = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const answers: number[] = [];
      let updatedRows: unknown[] = [];

      await given("client6 — свій клієнт therapist1, і картка client6 показує «Insurance: Not accepted»", async () => {
        expect(rest && key, "немає NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY").toBeTruthy();
        id = await ownClientNotAccepted("ins05-client6");
        await page.goto(card(id));
        await expect(page.getByTestId("user-name")).toHaveText("Therapist One");
        await expect(statusLine(page, "Insurance: Not accepted")).toBeVisible();
      });

      await when(
        "therapist1 напряму, оминаючи сторінки застосунку, пробує змінити статус перевірки страхування client6 на «Verified»",
        async () => {
          // Ті самі запити, що й у застосунку, але повз сторінки й дію: функція бази і прямий update таблиці.
          const api = await playwright.request.newContext({
            baseURL: rest,
            extraHTTPHeaders: { apikey: key!, Authorization: `Bearer ${await accessToken(context)}` },
          });
          const rpc = await api.post("/rest/v1/rpc/set_insurance_status", {
            data: { p_client_id: id, p_status: "verified" },
          });
          const patch = await api.patch(`/rest/v1/client_insurance?client_id=eq.${id}`, {
            data: { status: "verified" },
            headers: { Prefer: "return=representation" },
          });
          answers.push(rpc.status(), patch.status());
          updatedRows = patch.ok() ? ((await patch.json()) as unknown[]) : [];
          await api.dispose();
        },
      );

      await when("scheduler1 відкриває картку client6", async () => {
        await openAs(page, context, SCHEDULER, id, "Scheduler One");
      });

      await thenStep(
        page,
        {
          clause: "статус не змінився: scheduler1 у картці client6 бачить «Insurance: Not accepted»",
          visible: ["у шапці — Scheduler One", "рядок «Insurance: Not accepted»"],
          hidden: [
            "спробу therapist1 відхилено: функція set_insurance_status — 403, прямий update — 0 змінених рядків",
            "у базі статус картки — not_accepted",
          ],
        },
        async () => {
          await expect(statusLine(page, "Insurance: Not accepted")).toBeVisible();
          expect(answers[0], "відповідь бази на виклик функції терапевтом").toBe(403);
          expect(updatedRows, "рядки, змінені прямим update терапевта").toEqual([]);
          expect(await uatInsuranceOf(id)).toBe("not_accepted");
        },
      );
    },
  );
});
