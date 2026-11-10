// Вхід кожної ролі один раз за прогін → playwright/.auth/<role>.json (у .gitignore: там живі cookie сесії).
// Тести ролей беруть стан через test.use({ storageState: "playwright/.auth/<role>.json" }).
// У цьому проєкті запис вимкнено (playwright.config.ts: setup — video, trace і screenshot "off"): тут вводиться пароль.
//
// Змінні з паролями (лише назви; значення — у .env.local локально або в secrets CI, ніколи в коді):
//   DEMO_USER_PASSWORD           — спільний пароль акаунтів із supabase/demo-users.json (npm run users:demo);
//   UAT_PASSWORD_<РОЛЬ>          — необов'язково: окремий пароль для ролі, напр. UAT_PASSWORD_ADMIN.
//
// Джерело: демо-репо курсу, tests/e2e/auth.setup.ts (тег ws8-03-uat). ROLES — акаунти з AC-CARD-06, 12, 16 і AC-INS-01…06
// на проді (supabase/demo-users.json).
import { expect, test as setup } from "@playwright/test";
import { signIn } from "./support/uat";

// Зріз 3 (AC-INS-03) додає admin1 і другого планувальника scheduler2: ключ — ім'я файлу стану, role — роль у шапці.
const ROLES = {
  scheduler: { email: "scheduler1@example.test", role: "scheduler" },
  scheduler2: { email: "scheduler2@example.test", role: "scheduler" },
  therapist: { email: "therapist1@example.test", role: "therapist" },
  admin: { email: "admin1@example.test", role: "admin" },
} as const;

for (const [key, { email, role }] of Object.entries(ROLES)) {
  setup(`вхід: ${key}`, async ({ page }) => {
    const password = process.env[`UAT_PASSWORD_${key.toUpperCase()}`] ?? process.env.DEMO_USER_PASSWORD;
    expect(password, `немає пароля для ${key}: DEMO_USER_PASSWORD або UAT_PASSWORD_${key.toUpperCase()}`).toBeTruthy();
    await signIn(page, email, password!);
    // Шапка показує ім'я й роль із profiles, а не email: роль доводить, що це справді акаунт цієї ролі.
    await expect(page.getByTestId("user-role")).toHaveText(role, { ignoreCase: true });
    await page.context().storageState({ path: `playwright/.auth/${key}.json` });
  });
}
