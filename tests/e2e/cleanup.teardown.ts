// Прибирання після прогону (teardown проєкту setup): видаляє всіх uat-*@example.test, навіть залишки обірваних
// прогонів, і падає, якщо хоч один лишився. Підсумок — у test-results/uat-cleanup.json (його читає звіт UAT).
// Без SUPABASE_SECRET_KEY (прогін лише AC, що нічого не пишуть: --grep-invert '@writes') прибирати нічого — тесту немає.
import { writeFileSync } from "node:fs";
import { expect, test as teardown } from "@playwright/test";
import { deleteUatClients, deleteUatUsers, deletedThisRun, hasAdminKey } from "./support/admin";

if (hasAdminKey()) {
  teardown("прибирання: синтетичні uat-*@example.test", async () => {
    const result = await deleteUatUsers();
    writeFileSync(
      "test-results/uat-cleanup.json",
      // deleted — усе, що прибрав цей прогін: afterAll специфікацій і цей teardown.
      JSON.stringify({ at: new Date().toISOString(), ...result, deleted: deletedThisRun() }, null, 2),
    );
    expect(result.remaining, "лишились синтетичні користувачі").toEqual([]);
    // Картки uat-*@example.test зрізу 3 (UAT AC-INS-01…06) — разом з їхніми утриманнями й статусами (каскад).
    expect((await deleteUatClients()).remaining, "лишились синтетичні картки клієнтів").toBe(0);
    expect(result.leftoverRequests, "лишились заявки синтетичних користувачів").toBe(0);
  });
}
