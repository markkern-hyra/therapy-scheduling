// Утримання (задача 3.1 impl-slot-hold): правила запису — у тригері бази, видимість — у RLS (design.md, рішення 2–4).
// Час — справжній now() бази, тож слоти беремо відносно поточного моменту (на початку години).
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
let scheduler1: string;
let scheduler2: string;
let therapist1: string;
let therapist2: string;
let client1: string;
let client2: string;

const HOUR = 3_600_000;
const hourFromNow = (hours: number) => {
  const d = new Date(Date.now() + hours * HOUR);
  d.setUTCMinutes(0, 0, 0);
  return d;
};
const inAWeek = hourFromNow(7 * 24);

async function slot(therapist: string, startsAt: Date) {
  const [row] = await t.asService<{ id: string }>(
    "insert into public.slots (therapist_id, starts_at, ends_at) values ($1, $2, $3) returning id",
    [therapist, startsAt.toISOString(), new Date(startsAt.getTime() + HOUR).toISOString()],
  );
  return row.id;
}

const hold = (user: string, slotId: string, clientId: string) =>
  t.asUser<{ id: string; created_at: Date; expires_at: Date; confirmed_at: Date | null }>(
    user,
    "insert into public.holds (slot_id, client_id) values ($1, $2) returning id, created_at, expires_at, confirmed_at",
    [slotId, clientId],
  );

const holdsOf = (slotId: string) =>
  t.asService<{ client_id: string; expires_at: Date }>("select client_id, expires_at from public.holds where slot_id = $1", [
    slotId,
  ]);

beforeAll(async () => {
  t = await createTestDb();
  scheduler1 = t.users["scheduler1@example.test"];
  scheduler2 = t.users["scheduler2@example.test"];
  therapist1 = t.users["therapist1@example.test"];
  therapist2 = t.users["therapist2@example.test"];
  const clients = await t.asService<{ id: string; email: string }>("select id, email from public.clients");
  client1 = clients.find((c) => c.email === "client1@example.test")!.id;
  client2 = clients.find((c) => c.email === "client2@example.test")!.id;
}, 60_000);

beforeEach(async () => {
  await t.asService("delete from public.holds");
  await t.asService("delete from public.slots");
});

describe("holds: утримання слоту", () => {
  it("AC-HOLD-02: утримання «Held» на 24 години від моменту створення", async () => {
    const s = await slot(therapist1, inAWeek);
    const [row] = await hold(scheduler1, s, client1);
    expect(row.confirmed_at).toBeNull();
    expect(row.expires_at.getTime() - row.created_at.getTime()).toBe(24 * HOUR);
    expect(Math.abs(row.created_at.getTime() - Date.now())).toBeLessThan(60_000);
  });

  it("AC-HOLD-10: щойно створеного клієнта можна вибрати й утримати за ним слот", async () => {
    const [created] = await t.asUser<{ id: string }>(
      scheduler1,
      "insert into public.clients (full_name, email) values ('Client Three', 'client3@example.test') returning id",
    );
    const s = await slot(therapist1, inAWeek);
    await hold(scheduler1, s, created.id);
    expect((await holdsOf(s)).map((h) => h.client_id)).toEqual([created.id]);
  });

  it("AC-HOLD-03: слот уже утримано за client1 — утримання за client2 не створюється (SLOT_TAKEN)", async () => {
    const s = await slot(therapist1, inAWeek);
    await hold(scheduler1, s, client1);
    await expect(hold(scheduler2, s, client2)).rejects.toThrow("SLOT_TAKEN");
    expect((await holdsOf(s)).map((h) => h.client_id)).toEqual([client1]);
  });

  it("AC-HOLD-04: друга спроба утримати той самий слот після першої — рівно одне утримання (SLOT_TAKEN)", async () => {
    // Одночасність серіалізує блокування рядка слоту (for update); PGlite має одне з'єднання, тож тут — послідовно,
    // а два вікна браузера — ручна перевірка в PR.
    const s = await slot(therapist1, inAWeek);
    await hold(scheduler1, s, client1);
    await expect(hold(scheduler2, s, client2)).rejects.toThrow("SLOT_TAKEN");
    expect(await holdsOf(s)).toHaveLength(1);
  });

  it("AC-HOLD-17: повторне утримання за тим самим клієнтом — не створюється, «Held until» не змінюється", async () => {
    const s = await slot(therapist1, inAWeek);
    const [first] = await hold(scheduler1, s, client1);
    await expect(hold(scheduler1, s, client1)).rejects.toThrow("SLOT_TAKEN");
    expect(await holdsOf(s)).toEqual([{ client_id: client1, expires_at: first.expires_at }]);
  });

  it("AC-HOLD-07: слот, що вже почався, не утримується (SLOT_STARTED)", async () => {
    const s = await slot(therapist1, hourFromNow(0)); // почався на початку поточної години
    await expect(hold(scheduler1, s, client1)).rejects.toThrow("SLOT_STARTED");
    expect(await holdsOf(s)).toEqual([]);
  });

  it("AC-HOLD-08: терапевт не утримує слот (HOLD_FORBIDDEN), утримань не з'явилось", async () => {
    const s = await slot(therapist1, inAWeek);
    await expect(hold(therapist1, s, client1)).rejects.toThrow("HOLD_FORBIDDEN");
    expect(await holdsOf(s)).toEqual([]);
  });

  it("відвідувач без входу не пише утримань", async () => {
    const s = await slot(therapist1, inAWeek);
    await expect(
      t.asAnon("insert into public.holds (slot_id, client_id) values ($1, $2)", [s, client1]),
    ).rejects.toThrow(/permission denied/);
    expect(await holdsOf(s)).toEqual([]);
  });

  it("AC-HOLD-25: клієнт уже має «Held» у цей час в іншого терапевта — не створюється (CLIENT_BUSY)", async () => {
    const s1 = await slot(therapist1, inAWeek);
    const s2 = await slot(therapist2, inAWeek);
    await hold(scheduler1, s1, client1);
    await expect(hold(scheduler2, s2, client1)).rejects.toThrow("CLIENT_BUSY");
    expect(await holdsOf(s2)).toEqual([]);
  });

  it("AC-HOLD-26: прострочене утримання клієнта не заважає утримати слот того самого часу", async () => {
    const s1 = await slot(therapist1, inAWeek);
    const s2 = await slot(therapist2, inAWeek);
    const [old] = await hold(scheduler1, s1, client1);
    await t.asService(
      "update public.holds set created_at = now() - interval '25 hours', expires_at = now() - interval '1 hour' where id = $1",
      [old.id],
    );
    const [row] = await hold(scheduler2, s2, client1);
    expect(row.confirmed_at).toBeNull();
    expect(row.expires_at.getTime()).toBeGreaterThan(Date.now());
  });

  it("суміжні слоти клієнта не перетинаються — обидва утримуються", async () => {
    const s1 = await slot(therapist1, inAWeek);
    const s2 = await slot(therapist2, new Date(inAWeek.getTime() + HOUR));
    await hold(scheduler1, s1, client1);
    await hold(scheduler1, s2, client1);
    expect(await holdsOf(s2)).toHaveLength(1);
  });

  it("час створення й прострочення ставить база, а не запит", async () => {
    const s = await slot(therapist1, inAWeek);
    await expect(
      t.asUser(
        scheduler1,
        "insert into public.holds (slot_id, client_id, expires_at) values ($1, $2, now() + interval '30 days')",
        [s, client1],
      ),
    ).rejects.toThrow(/permission denied/);
    expect(await holdsOf(s)).toEqual([]);
  });
});

describe("holds: хто бачить", () => {
  it("терапевт бачить лише активні утримання на власних слотах; планувальник — усі", async () => {
    const s1 = await slot(therapist1, inAWeek);
    const s2 = await slot(therapist2, inAWeek);
    const s3 = await slot(therapist1, new Date(inAWeek.getTime() + 2 * HOUR));
    await hold(scheduler1, s1, client1);
    await hold(scheduler1, s2, client2);
    const [expired] = await hold(scheduler1, s3, client2);
    await t.asService(
      "update public.holds set created_at = now() - interval '25 hours', expires_at = now() - interval '1 hour' where id = $1",
      [expired.id],
    );

    const own = await t.asUser<{ slot_id: string }>(therapist1, "select slot_id from public.holds");
    expect(own.map((h) => h.slot_id)).toEqual([s1]);
    expect(await t.asUser(scheduler2, "select id from public.holds")).toHaveLength(3);
    await expect(t.asAnon("select id from public.holds")).rejects.toThrow(/permission denied/);
  });
});
