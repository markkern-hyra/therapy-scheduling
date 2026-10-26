// Слоти терапевтів (задача 2.1 impl-slot-hold): права на рівні бази й демо-слоти.
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
let therapist1: string;
let therapist2: string;

beforeAll(async () => {
  t = await createTestDb();
  therapist1 = t.users["therapist1@example.test"];
  therapist2 = t.users["therapist2@example.test"];
  await t.asService(
    `insert into public.slots (therapist_id, starts_at, ends_at) values
       ($1, '2026-11-03 18:00Z', '2026-11-03 19:00Z'),
       ($2, '2026-11-03 18:00Z', '2026-11-03 19:00Z')`,
    [therapist1, therapist2],
  );
}, 60_000);

describe("slots: хто бачить і хто пише", () => {
  it("планувальник і адміністратор бачать слоти всіх терапевтів", async () => {
    for (const email of ["scheduler1@example.test", "admin@example.test"]) {
      const rows = await t.asUser(t.users[email], "select therapist_id from public.slots");
      expect(rows).toHaveLength(2);
    }
  });

  it("терапевт бачить лише власні слоти", async () => {
    const rows = await t.asUser<{ therapist_id: string }>(therapist1, "select therapist_id from public.slots");
    expect(rows.map((r) => r.therapist_id)).toEqual([therapist1]);
  });

  it("відвідувач без входу не читає слотів", async () => {
    await expect(t.asAnon("select * from public.slots")).rejects.toThrow(/permission denied/);
  });

  it("планувальник не створює слотів — лише сид (service_role)", async () => {
    await expect(
      t.asUser(
        t.users["scheduler1@example.test"],
        "insert into public.slots (therapist_id, starts_at, ends_at) values ($1, '2026-11-04 18:00Z', '2026-11-04 19:00Z')",
        [therapist1],
      ),
    ).rejects.toThrow(/permission denied/);
    const [{ n }] = await t.asService<{ n: number }>("select count(*)::int as n from public.slots");
    expect(n).toBe(2);
  });

  it("слот триває рівно 60 хвилин", async () => {
    await expect(
      t.asService(
        "insert into public.slots (therapist_id, starts_at, ends_at) values ($1, '2026-11-05 18:00Z', '2026-11-05 18:30Z')",
        [therapist1],
      ),
    ).rejects.toThrow(/slots_duration_check/);
  });
});

describe("generate_demo_slots", () => {
  it("створює терапевтам слоти пн–пт 09:00–16:00 за LA на поточний і 3 наступні тижні, повторний виклик не дублює", async () => {
    await t.asService("delete from public.slots");
    await t.asService("select public.generate_demo_slots()");
    await t.asService("select public.generate_demo_slots()");

    const rows = await t.asService<{ therapist_id: string; local: string; dow: number }>(
      `select therapist_id, to_char(starts_at at time zone 'America/Los_Angeles', 'HH24:MI') as local,
              extract(isodow from starts_at at time zone 'America/Los_Angeles')::int as dow
         from public.slots`,
    );
    // 2 терапевти × 4 тижні × 5 днів × 7 слотів (09:00…15:00).
    expect(rows).toHaveLength(2 * 4 * 5 * 7);
    expect(new Set(rows.map((r) => r.therapist_id))).toEqual(new Set([therapist1, therapist2]));
    expect(new Set(rows.map((r) => r.local))).toEqual(
      new Set(["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"]),
    );
    expect(rows.every((r) => r.dow >= 1 && r.dow <= 5)).toBe(true);
  });

  it("користувач застосунку не викликає generate_demo_slots", async () => {
    await expect(
      t.asUser(t.users["admin@example.test"], "select public.generate_demo_slots()"),
    ).rejects.toThrow(/permission denied/);
  });
});
