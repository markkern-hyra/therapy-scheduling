// Підтвердження (задача 4.1 impl-slot-hold): правила — у тригері бази, тож прямий запит отримує ті самі відмови.
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
let scheduler1: string;
let scheduler2: string;
let admin1: string;
let therapist1: string;
let therapist2: string;
let client: string;

const HOUR = 3_600_000;
let nextHour = 24;
// Кожен тест — власний слот і клієнт: сеанси не перетинаються.
const hourFromNow = (hours: number) => {
  const d = new Date(Date.now() + hours * HOUR);
  d.setUTCMinutes(0, 0, 0);
  return d;
};

async function heldSlot(by = scheduler1) {
  nextHour += 2;
  const startsAt = hourFromNow(nextHour);
  const [slot] = await t.asService<{ id: string }>(
    "insert into public.slots (therapist_id, starts_at, ends_at) values ($1, $2, $3) returning id",
    [therapist1, startsAt.toISOString(), new Date(startsAt.getTime() + HOUR).toISOString()],
  );
  const [hold] = await t.asUser<{ id: string }>(by, "insert into public.holds (slot_id, client_id) values ($1, $2) returning id", [
    slot.id,
    client,
  ]);
  return { holdId: hold.id, slotId: slot.id };
}

const confirm = (user: string, holdId: string, at = "2000-01-01T00:00:00Z") =>
  t.asUser(user, "update public.holds set confirmed_at = $1 where id = $2", [at, holdId]);

const confirmedAt = async (holdId: string) =>
  (await t.asService<{ confirmed_at: Date | null }>("select confirmed_at from public.holds where id = $1", [holdId]))[0].confirmed_at;

beforeAll(async () => {
  t = await createTestDb();
  scheduler1 = t.users["scheduler1@example.test"];
  scheduler2 = t.users["scheduler2@example.test"];
  admin1 = t.users["admin1@example.test"];
  therapist1 = t.users["therapist1@example.test"];
  therapist2 = t.users["therapist2@example.test"];
  const [row] = await t.asService<{ id: string }>(
    `insert into public.clients (kind, full_name, email, birth_date, language)
     values ('adult', 'Client Confirm', 'clientconfirm@example.test', '1990-05-14', 'English') returning id`,
  );
  client = row.id;
}, 60_000);

describe("підтвердження утримання", () => {
  it("AC-HOLD-12: планувальник підтверджує — сеанс не прострочується й після 24 годин", async () => {
    const { holdId, slotId } = await heldSlot();
    await confirm(scheduler1, holdId);
    expect(await confirmedAt(holdId)).not.toBeNull();

    await t.asService("update public.holds set expires_at = now() - interval '1 minute' where id = $1", [holdId]);
    await expect(
      t.asUser(scheduler2, "insert into public.holds (slot_id, client_id) values ($1, $2)", [slotId, client]),
    ).rejects.toThrow("SLOT_TAKEN");
  });

  it("AC-HOLD-12: час підтвердження ставить база, а не запит", async () => {
    const { holdId } = await heldSlot();
    await confirm(scheduler1, holdId, "2000-01-01T00:00:00Z");
    expect((await confirmedAt(holdId))!.getFullYear()).toBeGreaterThan(2000);
  });

  it("AC-HOLD-13: прострочене утримання не підтверджується (HOLD_EXPIRED)", async () => {
    const { holdId } = await heldSlot();
    await t.asService("update public.holds set expires_at = now() - interval '1 minute' where id = $1", [holdId]);
    await expect(confirm(scheduler1, holdId)).rejects.toThrow("HOLD_EXPIRED");
    expect(await confirmedAt(holdId)).toBeNull();
  });

  it("AC-HOLD-14: therapist1 оновлює confirmed_at прямим запитом — CONFIRM_FORBIDDEN, confirmed_at лишився null", async () => {
    const { holdId } = await heldSlot();
    await expect(confirm(therapist1, holdId)).rejects.toThrow("CONFIRM_FORBIDDEN");
    expect(await confirmedAt(holdId)).toBeNull();
  });

  it("AC-HOLD-14: чуже утримання терапевт навіть не бачить — confirmed_at лишився null", async () => {
    const { holdId } = await heldSlot();
    await confirm(therapist2, holdId);
    expect(await confirmedAt(holdId)).toBeNull();
  });

  it("AC-HOLD-19: адміністратор утримує й підтверджує так само, як планувальник", async () => {
    const { holdId } = await heldSlot(admin1);
    await confirm(admin1, holdId);
    expect(await confirmedAt(holdId)).not.toBeNull();
  });

  it("AC-HOLD-22: слот уже почався — не підтверджується (CONFIRM_STARTED), утримання лишається «Held»", async () => {
    const { holdId, slotId } = await heldSlot();
    await t.asService(
      `update public.slots set starts_at = date_trunc('hour', now()), ends_at = date_trunc('hour', now()) + interval '60 minutes' where id = $1`,
      [slotId],
    );
    await expect(confirm(scheduler1, holdId)).rejects.toThrow("CONFIRM_STARTED");
    expect(await confirmedAt(holdId)).toBeNull();
  });

  it("AC-HOLD-23: до початку слоту утримання підтверджується", async () => {
    const { holdId, slotId } = await heldSlot();
    await t.asService(
      `update public.slots set starts_at = date_trunc('hour', now()) + interval '1 hour', ends_at = date_trunc('hour', now()) + interval '2 hours' where id = $1`,
      [slotId],
    );
    await confirm(scheduler1, holdId);
    expect(await confirmedAt(holdId)).not.toBeNull();
  });

  it("AC-HOLD-27: scheduler2 підтверджує утримання, яке створив scheduler1", async () => {
    const { holdId } = await heldSlot(scheduler1);
    await confirm(scheduler2, holdId);
    expect(await confirmedAt(holdId)).not.toBeNull();
  });

  it("AC-HOLD-36: друге підтвердження не виконується (ALREADY_CONFIRMED), час першого не змінюється", async () => {
    const { holdId } = await heldSlot();
    await confirm(scheduler1, holdId);
    const first = await confirmedAt(holdId);
    await expect(confirm(scheduler2, holdId)).rejects.toThrow("ALREADY_CONFIRMED");
    expect(await confirmedAt(holdId)).toEqual(first);
  });

  it("AC-HOLD-14: інші колонки утримання через update не змінюються", async () => {
    const { holdId } = await heldSlot();
    await expect(
      t.asUser(scheduler1, "update public.holds set expires_at = now() + interval '30 days' where id = $1", [holdId]),
    ).rejects.toThrow(/permission denied/);
  });
});
