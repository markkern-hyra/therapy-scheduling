// Картка клієнта з анкети й доступ без ролі (зріз 2, задача 1.1 impl-client-cards). Відмови — на рівні бази (RLS,
// GRANT, check), і кожен тест перевіряє і відмову, і те, що картки не змінились.
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
let scheduler1: string;

type Card = {
  kind: "adult" | "child";
  full_name: string;
  email: string | null;
  birth_date: string | null;
  language: string | null;
  guardian_name: string | null;
  guardian_email: string | null;
};

const adult = (fullName: string, email: string): Card => ({
  kind: "adult",
  full_name: fullName,
  email,
  birth_date: "1990-05-14",
  language: "English",
  guardian_name: null,
  guardian_email: null,
});

const child = (fullName: string, guardianName: string | null, guardianEmail: string | null): Card => ({
  kind: "child",
  full_name: fullName,
  email: null,
  birth_date: "2015-03-02",
  language: "Spanish",
  guardian_name: guardianName,
  guardian_email: guardianEmail,
});

const INSERT = `insert into public.clients (kind, full_name, email, birth_date, language, guardian_name, guardian_email)
                values ($1, $2, $3, $4, $5, $6, $7) returning id`;
const insertAs = (user: string, c: Card) =>
  t.asUser<{ id: string }>(user, INSERT, [
    c.kind,
    c.full_name,
    c.email,
    c.birth_date,
    c.language,
    c.guardian_name,
    c.guardian_email,
  ]);

const count = async () => (await t.asService<{ n: number }>("select count(*)::int as n from public.clients"))[0].n;

beforeAll(async () => {
  t = await createTestDb();
  scheduler1 = t.users["scheduler1@example.test"];
}, 60_000);

describe("картка з анкети", () => {
  it("AC-CARD-01: scheduler1 створює картку дорослого — усі дані анкети збережено", async () => {
    const [{ id }] = await insertAs(scheduler1, adult("Client Six", "client6@example.test"));
    const [row] = await t.asService<Record<string, unknown>>(
      "select kind, full_name, email, birth_date::text as birth_date, language from public.clients where id = $1",
      [id],
    );
    expect(row).toEqual({
      kind: "adult",
      full_name: "Client Six",
      email: "client6@example.test",
      birth_date: "1990-05-14",
      language: "English",
    });
  });

  it("AC-CARD-02: scheduler1 створює картку дитини з опікуном — без власного email, з даними опікуна", async () => {
    const [{ id }] = await insertAs(scheduler1, child("Client Seven", "Guardian Seven", "guardian7@example.test"));
    const [row] = await t.asService<Record<string, unknown>>(
      "select kind, email, language, guardian_name, guardian_email from public.clients where id = $1",
      [id],
    );
    expect(row).toEqual({
      kind: "child",
      email: null,
      language: "Spanish",
      guardian_name: "Guardian Seven",
      guardian_email: "guardian7@example.test",
    });
  });

  it("AC-CARD-03: картку дитини без імені чи email опікуна (або з некоректним email) не створено", async () => {
    const before = await count();
    for (const c of [
      child("Client Eight", null, "guardian8@example.test"),
      child("Client Eight", "   ", "guardian8@example.test"),
      child("Client Eight", "Guardian Eight", null),
      child("Client Eight", "Guardian Eight", "guardian8example.test"),
    ]) {
      await expect(insertAs(scheduler1, c)).rejects.toThrow(/clients_guardian_check/);
    }
    expect(await count()).toBe(before);
  });

  it("нова картка без дати народження чи мови, або з датою народження в майбутньому — не створено", async () => {
    const before = await count();
    const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    for (const c of [
      { ...adult("Client X", "x1@example.test"), birth_date: null },
      { ...adult("Client X", "x2@example.test"), language: null },
      { ...adult("Client X", "x3@example.test"), language: "French" },
      { ...adult("Client X", "x4@example.test"), birth_date: tomorrow },
    ]) {
      await expect(insertAs(scheduler1, c)).rejects.toThrow(/clients_intake_check/);
    }
    expect(await count()).toBe(before);
  });

  it("дорослий має власний email, дитина — ні", async () => {
    const before = await count();
    await expect(insertAs(scheduler1, { ...adult("Client X", "x5@example.test"), email: null })).rejects.toThrow(
      /clients_contact_check/,
    );
    await expect(
      insertAs(scheduler1, { ...child("Client X", "Guardian X", "gx@example.test"), email: "x6@example.test" }),
    ).rejects.toThrow(/clients_contact_check/);
    expect(await count()).toBe(before);
  });

  it("правило анкети — лише для нових карток: картки зрізу 1 без дати й мови лишаються дійсними («Adult»)", async () => {
    const [constraint] = await t.asService<{ convalidated: boolean }>(
      "select convalidated from pg_constraint where conname = 'clients_intake_check'",
    );
    expect(constraint.convalidated).toBe(false); // not valid: наявні рядки не перевіряються
    const [column] = await t.asService<{ column_default: string }>(
      "select column_default from information_schema.columns where table_name = 'clients' and column_name = 'kind'",
    );
    expect(column.column_default).toBe("'adult'::text");
  });
});

describe("хто створює й бачить картки", () => {
  it("AC-CARD-06: therapist1 не створює картку — відмова, кількість карток та сама", async () => {
    const before = await count();
    await expect(
      insertAs(t.users["therapist1@example.test"], adult("Client Ten", "client10@example.test")),
    ).rejects.toThrow(/row-level security/);
    expect(await count()).toBe(before);
  });

  it("AC-CARD-07: відвідувач без входу не читає й не створює картки, картки не змінились", async () => {
    const before = await count();
    await expect(t.asAnon("select id from public.clients")).rejects.toThrow(/permission denied/);
    await expect(
      t.asAnon("insert into public.clients (full_name, email) values ('Client Ten', 'client10@example.test')"),
    ).rejects.toThrow(/permission denied/);
    await expect(t.asAnon("select id from public.holds")).rejects.toThrow(/permission denied/);
    expect(await count()).toBe(before);
  });

  it("AC-CARD-10: scheduler2 і admin1 бачать усі картки, у картці дитини — дані опікуна", async () => {
    const all = await count();
    for (const email of ["scheduler2@example.test", "admin1@example.test"]) {
      const rows = await t.asUser<{ full_name: string; guardian_email: string | null }>(
        t.users[email],
        "select full_name, guardian_email from public.clients",
      );
      expect(rows).toHaveLength(all);
      expect(rows.find((r) => r.full_name === "Client Seven")?.guardian_email).toBe("guardian7@example.test");
    }
  });

  it("AC-CARD-11: newuser1 без ролі не бачить і не створює карток, картки не змінились", async () => {
    const newuser = t.users["newuser1@example.test"];
    const [profile] = await t.asService<{ role: string | null }>("select role from public.profiles where id = $1", [
      newuser,
    ]);
    expect(profile.role).toBeNull();
    const before = await count();
    expect(await t.asUser(newuser, "select id from public.clients")).toEqual([]);
    await expect(insertAs(newuser, adult("Client Ten", "client10@example.test"))).rejects.toThrow(/row-level security/);
    expect(await count()).toBe(before);
  });

  it("новий користувач Auth отримує профіль без ролі", async () => {
    const id = "b0000000-0000-0000-0000-000000000001";
    await t.db.exec("begin; set local role supabase_auth_admin;");
    await t.db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'new2@example.test', '{}')", [id]);
    await t.db.exec("commit");
    const [profile] = await t.asService<{ role: string | null }>("select role from public.profiles where id = $1", [id]);
    expect(profile.role).toBeNull();
  });

  it("пастка «update own row»: ніхто не змінює собі роль — відмова, роль та сама", async () => {
    for (const email of ["newuser1@example.test", "therapist1@example.test"]) {
      const id = t.users[email];
      const [before] = await t.asService<{ role: string | null }>("select role from public.profiles where id = $1", [id]);
      await expect(
        t.asUser(id, "update public.profiles set role = 'admin' where id = $1", [id]),
      ).rejects.toThrow(/permission denied/);
      const [after] = await t.asService<{ role: string | null }>("select role from public.profiles where id = $1", [id]);
      expect(after.role).toBe(before.role);
    }
  });
});
