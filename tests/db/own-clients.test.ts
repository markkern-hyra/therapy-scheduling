// Свої клієнти терапевта (зріз 2, задача 2.1 impl-client-cards): «свій» — з утриманням «Held» або сеансом «Confirmed»
// у цього терапевта. Чужі й прострочені картки терапевту не видно вже в базі (RLS), а картки при цьому не змінюються.
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
let therapist1: string;
let therapist2: string;
const ids: Record<string, string> = {};

const HOUR = 3_600_000;
const inDays = (days: number, hour = 0) => {
  const d = new Date(Date.now() + days * 24 * HOUR + hour * HOUR);
  d.setUTCMinutes(0, 0, 0);
  return d;
};

async function card(key: string, sql: string) {
  const [row] = await t.asService<{ id: string }>(sql);
  ids[key] = row.id;
}

async function holdFor(therapist: string, client: string, startsAt: Date) {
  const [slot] = await t.asService<{ id: string }>(
    "insert into public.slots (therapist_id, starts_at, ends_at) values ($1, $2, $3) returning id",
    [therapist, startsAt.toISOString(), new Date(startsAt.getTime() + HOUR).toISOString()],
  );
  const [hold] = await t.asUser<{ id: string }>(
    t.users["scheduler1@example.test"],
    "insert into public.holds (slot_id, client_id) values ($1, $2) returning id",
    [slot.id, client],
  );
  return hold.id;
}

const visibleTo = (therapist: string) =>
  t.asUser<{ full_name: string; guardian_email: string | null; email: string | null }>(
    therapist,
    "select full_name, email, guardian_email from public.clients order by full_name",
  );

const cardOf = async (key: string) =>
  (await t.asService("select * from public.clients where id = $1", [ids[key]]))[0];

beforeAll(async () => {
  t = await createTestDb();
  therapist1 = t.users["therapist1@example.test"];
  therapist2 = t.users["therapist2@example.test"];
  await card(
    "client6",
    `insert into public.clients (kind, full_name, email, birth_date, language)
     values ('adult', 'Client Six', 'client6@example.test', '1990-05-14', 'English') returning id`,
  );
  await card(
    "client7",
    `insert into public.clients (kind, full_name, birth_date, language, guardian_name, guardian_email)
     values ('child', 'Client Seven', '2015-03-02', 'Spanish', 'Guardian Seven', 'guardian7@example.test') returning id`,
  );
  await card(
    "client9",
    `insert into public.clients (kind, full_name, email, birth_date, language)
     values ('adult', 'Client Nine', 'client9@example.test', '1988-01-20', 'English') returning id`,
  );
  // client6 — «Held» у therapist1; client7 — сеанс «Confirmed» у therapist1; client9 — «Held» у therapist2.
  await holdFor(therapist1, ids.client6, inDays(7));
  const session = await holdFor(therapist1, ids.client7, inDays(7, 1));
  await t.asService("update public.holds set confirmed_at = now() where id = $1", [session]);
  await holdFor(therapist2, ids.client9, inDays(7));
}, 60_000);

describe("свої клієнти терапевта", () => {
  it("AC-CARD-04: therapist1 бачить картки client6 і client7 з даними анкети й опікуна, client9 — ні", async () => {
    expect(await visibleTo(therapist1)).toEqual([
      { full_name: "Client Seven", email: null, guardian_email: "guardian7@example.test" },
      { full_name: "Client Six", email: "client6@example.test", guardian_email: null },
    ]);
  });

  it("AC-CARD-05: therapist1 за посиланням на картку client9 не отримує жодних даних, картка не змінилась", async () => {
    const before = await cardOf("client9");
    expect(await t.asUser(therapist1, "select * from public.clients where id = $1", [ids.client9])).toEqual([]);
    expect(
      await t.asUser(therapist1, "update public.clients set full_name = 'X' where id = $1 returning id", [ids.client9]).catch(
        (e: Error) => e.message,
      ),
    ).toMatch(/permission denied/);
    expect(await cardOf("client9")).toEqual(before);
  });

  it("AC-CARD-08: утримання прострочилось — client6 більше не свій для therapist1, картка не змінилась", async () => {
    const before = await cardOf("client6");
    await t.asService(
      `update public.holds set created_at = now() - interval '25 hours', expires_at = now() - interval '1 hour'
       where client_id = $1`,
      [ids.client6],
    );
    expect((await visibleTo(therapist1)).map((c) => c.full_name)).toEqual(["Client Seven"]);
    expect(await t.asUser(therapist1, "select id from public.clients where id = $1", [ids.client6])).toEqual([]);
    expect(await cardOf("client6")).toEqual(before);
  });

  it("AC-CARD-09: therapist2 без «Held» і «Confirmed» не бачить жодної картки", async () => {
    await t.asService("delete from public.holds where client_id = $1", [ids.client9]);
    expect(await visibleTo(therapist2)).toEqual([]);
  });

  it("планувальник і далі бачить усі картки", async () => {
    const rows = await t.asUser(t.users["scheduler2@example.test"], "select id from public.clients");
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });
});
