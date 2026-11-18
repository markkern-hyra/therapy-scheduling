// Денний ліміт помічника, що складає чернетки картки (зріз 4, design.md impl-client-intake-draft, «Дані й РLS»):
// 50 запитів на добу практики (America/Los_Angeles) на весь застосунок. Рахує функція бази take_assistant_request — до
// виклику моделі; вичерпано чи роль не admin / scheduler — false, і дія показує «The assistant is unavailable…»
// (AC-INTAKE-08). Терапевт і відвідувач без входу ліміту не витрачають (AC-INTAKE-09). Кожен тест сам ставить «Дано».
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
let scheduler1: string;
let admin1: string;
let therapist1: string;

const take = async (userId: string) =>
  (await t.asUser<{ ok: boolean }>(userId, "select public.take_assistant_request() as ok"))[0].ok;
// Скільки запитів узято сьогодні (в обхід RLS, як Dashboard); рядка немає — 0.
const usedToday = async () =>
  (
    await t.asService<{ requests: number }>(
      `select coalesce(sum(requests), 0)::int as requests from private.assistant_usage
       where day = (now() at time zone 'America/Los_Angeles')::date`,
    )
  )[0].requests;
const setUsedToday = (requests: number) =>
  t.asService(
    `insert into private.assistant_usage (day, requests) values ((now() at time zone 'America/Los_Angeles')::date, $1)
     on conflict (day) do update set requests = excluded.requests`,
    [requests],
  );

beforeAll(async () => {
  t = await createTestDb();
  scheduler1 = t.users["scheduler1@example.test"];
  admin1 = t.users["admin1@example.test"];
  therapist1 = t.users["therapist1@example.test"];
});

beforeEach(async () => {
  await t.asService("delete from private.assistant_usage");
});

describe("денний ліміт помічника", () => {
  it("AC-INTAKE-08: планувальник і адміністратор беруть запит — лічильник дня росте", async () => {
    expect(await take(scheduler1)).toBe(true);
    expect(await take(admin1)).toBe(true);
    expect(await usedToday()).toBe(2);
  });

  it("AC-INTAKE-08: 50-й запит дня ще дозволено, 51-й — ні, і лічильник лишається 50", async () => {
    await setUsedToday(49);
    expect(await take(scheduler1)).toBe(true);
    expect(await usedToday()).toBe(50);
    expect(await take(scheduler1)).toBe(false);
    expect(await take(admin1)).toBe(false);
    expect(await usedToday()).toBe(50);
  });

  it("AC-INTAKE-08: запити минулого дня не рахуються в сьогоднішньому ліміті", async () => {
    await t.asService(
      `insert into private.assistant_usage (day, requests)
       values ((now() at time zone 'America/Los_Angeles')::date - 1, 50)`,
    );
    expect(await take(scheduler1)).toBe(true);
    expect(await usedToday()).toBe(1);
  });

  it("AC-INTAKE-09: терапевт напряму — false, ліміт не витрачено", async () => {
    expect(await take(therapist1)).toBe(false);
    expect(await usedToday()).toBe(0);
  });

  it("AC-INTAKE-09: відвідувач без входу не може викликати функцію, ліміт не витрачено", async () => {
    await expect(t.asAnon("select public.take_assistant_request()")).rejects.toMatchObject({
      code: "42501",
      message: expect.stringContaining("permission denied for function take_assistant_request"),
    });
    expect(await usedToday()).toBe(0);
  });

  it("AC-INTAKE-08: лічильник не видно й не змінити напряму — ні планувальнику, ні анонімові", async () => {
    for (const run of [
      () => t.asUser(scheduler1, "select * from private.assistant_usage"),
      () => t.asUser(scheduler1, "update private.assistant_usage set requests = 0"),
      () => t.asAnon("select * from private.assistant_usage"),
    ]) {
      // Планувальник має usage на схемі private (для хелперів ролей) — відмова на таблиці; анонім — ще на схемі.
      await expect(run()).rejects.toMatchObject({
        code: "42501",
        message: expect.stringMatching(/permission denied for (table assistant_usage|schema private)/),
      });
    }
  });
});
