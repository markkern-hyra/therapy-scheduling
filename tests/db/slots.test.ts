// Слоти терапевтів (задача 2.1 impl-slot-hold): права на рівні бази й демо-слоти.
import { beforeAll, describe, expect, it } from "vitest";
import { practiceToday } from "@/lib/scheduling/time";
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

  it("AC-HOLD-09: терапевт бачить лише власні слоти, а не слоти іншого терапевта", async () => {
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

  it("терапевт не змінює й не видаляє власний слот", async () => {
    await expect(
      t.asUser(therapist1, "update public.slots set starts_at = starts_at + interval '1 hour' where therapist_id = $1", [
        therapist1,
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      t.asUser(therapist1, "delete from public.slots where therapist_id = $1", [therapist1]),
    ).rejects.toThrow(/permission denied/);
    const rows = await t.asService<{ starts_at: Date }>("select starts_at from public.slots where therapist_id = $1", [
      therapist1,
    ]);
    expect(rows.map((r) => r.starts_at.toISOString())).toEqual(["2026-11-03T18:00:00.000Z"]);
  });

  it("слот починається на початку години", async () => {
    await expect(
      t.asService(
        "insert into public.slots (therapist_id, starts_at, ends_at) values ($1, '2026-11-05 18:30Z', '2026-11-05 19:30Z')",
        [therapist1],
      ),
    ).rejects.toThrow(/slots_starts_on_hour_check/);
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
  it("створює терапевтам слоти пн–пт, 09:00…16:00 за LA на 8 тижнів уперед, повторний виклик не дублює", async () => {
    await t.asService("delete from public.slots");
    await t.asService("select public.generate_demo_slots()");
    const count = async () => (await t.asService<{ n: number }>("select count(*)::int as n from public.slots"))[0].n;
    const first = await count();
    await t.asService("select public.generate_demo_slots()");
    expect(await count()).toBe(first);

    const rows = await t.asService<{ therapist_id: string; local: string; dow: number }>(
      `select therapist_id, to_char(starts_at at time zone 'America/Los_Angeles', 'HH24:MI') as local,
              extract(isodow from starts_at at time zone 'America/Los_Angeles')::int as dow
         from public.slots`,
    );
    expect(new Set(rows.map((r) => r.therapist_id))).toEqual(new Set([therapist1, therapist2]));
    expect(new Set(rows.map((r) => r.local))).toEqual(
      new Set(["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"]),
    );
    expect(rows.every((r) => r.dow >= 1 && r.dow <= 5)).toBe(true);

    // Вікно — від понеділка поточного тижня за LA до останнього робочого дня в межах 8 тижнів від сьогодні.
    const today = new Date(`${practiceToday(new Date())}T00:00:00Z`);
    const monday = new Date(today);
    monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
    const last = new Date(today);
    last.setUTCDate(today.getUTCDate() + 55);
    while (last.getUTCDay() === 0 || last.getUTCDay() === 6) last.setUTCDate(last.getUTCDate() - 1);
    // Межі й години вище не помітять пропущений день посередині: у кожного терапевта — 8 слотів на кожен робочий день вікна.
    let weekdays = 0;
    for (const day = new Date(monday); day <= last; day.setUTCDate(day.getUTCDate() + 1)) {
      if (day.getUTCDay() >= 1 && day.getUTCDay() <= 5) weekdays++;
    }
    for (const therapist of [therapist1, therapist2]) {
      expect(rows.filter((r) => r.therapist_id === therapist)).toHaveLength(weekdays * 8);
    }
    const [range] = await t.asService<{ first: string; last: string }>(
      `select to_char(min(starts_at at time zone 'America/Los_Angeles'), 'YYYY-MM-DD HH24:MI') as first,
              to_char(max(starts_at at time zone 'America/Los_Angeles'), 'YYYY-MM-DD HH24:MI') as last
         from public.slots`,
    );
    expect(range).toEqual({
      first: `${monday.toISOString().slice(0, 10)} 09:00`,
      last: `${last.toISOString().slice(0, 10)} 16:00`,
    });
  });

  it("користувач застосунку не викликає generate_demo_slots", async () => {
    await expect(
      t.asUser(t.users["admin@example.test"], "select public.generate_demo_slots()"),
    ).rejects.toThrow(/permission denied/);
  });
});
