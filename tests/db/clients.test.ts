// Правила картки клієнта зрізу 1 тримає база (check і unique у міграції roles_and_clients, ADR 0003): тести на PGlite
// вставляють рядок так, як це робить createClientCard (cardFromForm картки дорослого → insert), і перевіряють відмову
// саме цим обмеженням і незмінні дані.
import { beforeAll, describe, expect, it } from "vitest";
import { cardFromForm } from "@/lib/scheduling/clients";
import { errorCode } from "@/lib/scheduling/messages";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
let scheduler: string;

// Картка дорослого з анкети (зріз 2): дата народження й мова коректні, перевіряємо лише ім'я та email.
const form = (fullName: string, email: string) => {
  const data = new FormData();
  for (const [name, value] of Object.entries({ kind: "adult", full_name: fullName, email, birth_date: "1990-05-14", language: "English" }))
    data.set(name, value);
  return cardFromForm(data);
};

const insert = (row: ReturnType<typeof form>) =>
  t.asUser(
    scheduler,
    `insert into public.clients (kind, full_name, email, birth_date, language, guardian_name, guardian_email)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [row.kind, row.full_name, row.email, row.birth_date, row.language, row.guardian_name, row.guardian_email],
  );

const count = async () =>
  (await t.asService<{ n: number }>("select count(*)::int as n from public.clients"))[0].n;

beforeAll(async () => {
  t = await createTestDb();
  scheduler = t.users["scheduler1@example.test"];
}, 60_000);

describe("clients: правила картки зрізу 1 у базі", () => {
  it("AC-HOLD-11: порожнє ім'я — клієнта не створено", async () => {
    const before = await count();
    await expect(insert(form("", "client3@example.test"))).rejects.toThrow(/clients_full_name_check/);
    expect(await count()).toBe(before);
  });

  it("AC-HOLD-15: email без @ — клієнта не створено", async () => {
    const before = await count();
    await expect(insert(form("Client Three", "client3example.test"))).rejects.toThrow(/clients_email_check/);
    expect(await count()).toBe(before);
  });

  it("AC-HOLD-39: email без крапки після «@», з двома «@», з порожньою частиною до «@» чи з пробілом — не створено", async () => {
    const before = await count();
    for (const email of ["client3@example", "client3@@example.test", "@example.test", "client 3@example.test"]) {
      await expect(insert(form("Client Three", email))).rejects.toThrow(/clients_email_check/);
    }
    expect(await count()).toBe(before);
  });

  it("AC-HOLD-16: той самий email — клієнта не створено", async () => {
    const before = await count();
    await expect(insert(form("Client One", "client1@example.test"))).rejects.toThrow(/clients_email_key/);
    expect(await count()).toBe(before);
  });

  it("AC-HOLD-34: той самий email іншим регістром і з пробілами — дублікат", async () => {
    const before = await count();
    await expect(insert(form("Client One", " Client1@Example.TEST "))).rejects.toThrow(/clients_email_key/);
    expect(await count()).toBe(before);
  });

  it("AC-HOLD-41: ім'я з самих пробілів — не створено; « Client Four » збережено як «Client Four»", async () => {
    const before = await count();
    await expect(insert(form("   ", "client5@example.test"))).rejects.toThrow(/clients_full_name_check/);
    expect(await count()).toBe(before);

    await insert(form(" Client Four ", "client4@example.test"));
    const rows = await t.asService<{ full_name: string }>("select full_name from public.clients where email = $1", [
      "client4@example.test",
    ]);
    expect(rows).toEqual([{ full_name: "Client Four" }]);
  });

  it("errorCode розпізнає справжні помилки бази за назвою обмеження", async () => {
    const codeOf = (row: ReturnType<typeof form>) =>
      insert(row).then(
        () => "inserted",
        (e: { code: string; message: string }) => errorCode(e),
      );
    expect(await codeOf(form("Client One", "client1@example.test"))).toBe("CLIENT_EXISTS");
    expect(await codeOf(form("Client Three", "client3example.test"))).toBe("CLIENT_INVALID");
    expect(await codeOf(form("", "client9@example.test"))).toBe("CLIENT_INVALID");
  });
});
