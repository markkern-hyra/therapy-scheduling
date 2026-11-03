// Розклад терапевта (задача 5.1 impl-slot-hold): функція бази віддає лише власні слоти й ім'я клієнта, без email.
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
let therapist1: string;
let therapist2: string;
let scheduler1: string;
let client: string;

const HOUR = 3_600_000;
const FROM = new Date(Date.now() - 14 * 24 * HOUR).toISOString();
const TO = new Date(Date.now() + 60 * 24 * HOUR).toISOString();
let nextHour = 48;

type Row = { slot_id: string; starts_at: Date; confirmed_at: Date | null; expires_at: Date | null; client_name: string | null };
const schedule = (user: string) =>
  t.asUser<Row>(user, "select * from public.therapist_schedule($1, $2)", [FROM, TO]);

async function freeSlot(therapist: string) {
  nextHour += 2;
  const d = new Date(Date.now() + nextHour * HOUR);
  d.setUTCMinutes(0, 0, 0);
  const [slot] = await t.asService<{ id: string }>(
    "insert into public.slots (therapist_id, starts_at, ends_at) values ($1, $2, $3) returning id",
    [therapist, d.toISOString(), new Date(d.getTime() + HOUR).toISOString()],
  );
  return slot.id;
}

const hold = (slotId: string) =>
  t.asUser<{ id: string }>(scheduler1, "insert into public.holds (slot_id, client_id) values ($1, $2) returning id", [slotId, client]);
const rowOf = async (user: string, slotId: string) => (await schedule(user)).find((r) => r.slot_id === slotId);

beforeAll(async () => {
  t = await createTestDb();
  therapist1 = t.users["therapist1@example.test"];
  therapist2 = t.users["therapist2@example.test"];
  scheduler1 = t.users["scheduler1@example.test"];
  const [row] = await t.asService<{ id: string }>(
    `insert into public.clients (kind, full_name, email, birth_date, language)
     values ('adult', 'Client Schedule', 'clientschedule@example.test', '1990-05-14', 'English') returning id`,
  );
  client = row.id;
}, 60_000);

describe("розклад терапевта", () => {
  it("AC-HOLD-09: therapist1 бачить власне утримання з ім'ям і «Held until», а розкладу therapist2 — ні", async () => {
    const own = await freeSlot(therapist1);
    const other = await freeSlot(therapist2);
    await hold(own);
    const row = await rowOf(therapist1, own);
    expect(row?.client_name).toBe("Client Schedule");
    expect(row?.expires_at).not.toBeNull();
    expect(await rowOf(therapist1, other)).toBeUndefined();
  });

  it("AC-HOLD-40: у розкладі є ім'я клієнта, а email немає в жодній колонці", async () => {
    const own = await freeSlot(therapist1);
    await hold(own);
    const row = await rowOf(therapist1, own);
    expect(Object.keys(row ?? {}).sort()).toEqual(["client_name", "confirmed_at", "ends_at", "expires_at", "slot_id", "starts_at"]);
    expect(JSON.stringify(row)).not.toContain("clientschedule@example.test");
  });

  it("AC-HOLD-21: прострочене утримання не показано, слот лишається в розкладі без клієнта", async () => {
    const own = await freeSlot(therapist1);
    const [h] = await hold(own);
    await t.asService("update public.holds set expires_at = now() - interval '1 minute' where id = $1", [h.id]);
    const row = await rowOf(therapist1, own);
    expect(row).toBeDefined();
    expect(row?.client_name).toBeNull();
    expect(row?.expires_at).toBeNull();
  });

  it("AC-HOLD-22: після початку слоту утримання «Held» лишається в розкладі з ім'ям клієнта", async () => {
    const own = await freeSlot(therapist1);
    await hold(own);
    await t.asService(
      `update public.slots set starts_at = date_trunc('hour', now()), ends_at = date_trunc('hour', now()) + interval '60 minutes' where id = $1`,
      [own],
    );
    expect((await rowOf(therapist1, own))?.client_name).toBe("Client Schedule");
  });

  it("AC-HOLD-30: тиждень показує лише свої слоти: раніший і пізніший слот у нього не входять", async () => {
    const [before, inside, after] = [await freeSlot(therapist1), await freeSlot(therapist1), await freeSlot(therapist1)];
    const startOf = async (id: string) =>
      (await t.asService<{ starts_at: Date }>("select starts_at from public.slots where id = $1", [id]))[0].starts_at;
    const rows = await t.asUser<Row>(therapist1, "select * from public.therapist_schedule($1, $2)", [
      await startOf(inside),
      await startOf(after),
    ]);
    const ids = rows.map((r) => r.slot_id);
    expect(ids).toContain(inside);
    expect(ids).not.toContain(before);
    expect(ids).not.toContain(after);
  });

  it("AC-HOLD-31: сеанс наступного тижня видно, лише коли запит охоплює цей тиждень", async () => {
    const session = await freeSlot(therapist1);
    const [h] = await hold(session);
    await t.asUser(scheduler1, "update public.holds set confirmed_at = now() where id = $1", [h.id]);
    const [{ starts_at: startsAt }] = await t.asService<{ starts_at: Date }>("select starts_at from public.slots where id = $1", [session]);
    const week = 7 * 24 * HOUR;
    const inWeek = await t.asUser<Row>(therapist1, "select * from public.therapist_schedule($1, $2)", [
      new Date(startsAt.getTime() - HOUR).toISOString(),
      new Date(startsAt.getTime() + week).toISOString(),
    ]);
    const previous = await t.asUser<Row>(therapist1, "select * from public.therapist_schedule($1, $2)", [
      new Date(startsAt.getTime() - week).toISOString(),
      startsAt.toISOString(),
    ]);
    expect(inWeek.find((r) => r.slot_id === session)?.confirmed_at).not.toBeNull();
    expect(previous.map((r) => r.slot_id)).not.toContain(session);
  });

  it("AC-CARD-11: без ролі розклад порожній", async () => {
    await t.asService("update public.profiles set role = null where id = $1", [therapist2]);
    expect(await schedule(therapist2)).toEqual([]);
    await t.asService("update public.profiles set role = 'therapist' where id = $1", [therapist2]);
  });
});

describe("сид доступності", () => {
  it("у therapist1 лише пн–пт, перший слот о 09:00, останній о 16:00, на 8 тижнів уперед", async () => {
    await t.asService("delete from public.holds");
    await t.asService("delete from public.slots");
    await t.asService("select public.generate_demo_slots()");
    const rows = await t.asService<{ dow: number; first: number; last: number; days: number; n: number }>(
      `select extract(isodow from local)::int as dow, min(extract(hour from local))::int as first,
              max(extract(hour from local))::int as last,
              (max(local)::date - current_date)::int as days, count(*)::int as n
       from (select starts_at at time zone 'America/Los_Angeles' as local from public.slots where therapist_id = $1) s
       group by 1 order by 1`,
      [therapist1],
    );
    expect(rows.map((r) => r.dow).every((d) => d <= 5)).toBe(true);
    expect(rows.every((r) => r.first === 9 && r.last === 16)).toBe(true);
    expect(Math.max(...rows.map((r) => r.days))).toBeGreaterThanOrEqual(52);
    expect(Math.max(...rows.map((r) => r.days))).toBeLessThanOrEqual(56);
  });
});
