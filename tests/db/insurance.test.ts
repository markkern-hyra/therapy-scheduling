// Статус перевірки страхування в картці клієнта (зріз 3, impl-insurance-status; вимога PM #33). Права — у базі (RLS і
// GRANT таблиці client_insurance): терапевт і відвідувач без входу статусу не змінюють навіть прямим запитом, а
// планувальник після кожної спроби бачить той самий статус. Рядка статусу немає — «Not set» (design.md, рішення 1).
// Кожен тест сам ставить «Дано» (в обхід RLS, як Dashboard), тож порядок тестів не важливий.
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./supabase-pglite";

let t: TestDb;
let admin1: string;
let scheduler1: string;
let scheduler2: string;
let therapist1: string;
const ids: Record<string, string> = {};

const HOUR = 3_600_000;
const inDays = (days: number, hour = 0) => {
  const d = new Date(Date.now() + days * 24 * HOUR + hour * HOUR);
  d.setUTCMinutes(0, 0, 0);
  return d;
};

async function card(key: string, fullName: string, email: string) {
  const [row] = await t.asService<{ id: string }>(
    `insert into public.clients (kind, full_name, email, birth_date, language)
     values ('adult', $1, $2, '1990-05-14', 'English') returning id`,
    [fullName, email],
  );
  ids[key] = row.id;
}

// «Свій клієнт» — утримання «Held» у терапевта на слот, що ще не почався (як у tests/db/own-clients.test.ts).
async function holdFor(therapist: string, client: string, startsAt: Date) {
  const [slot] = await t.asService<{ id: string }>(
    "insert into public.slots (therapist_id, starts_at, ends_at) values ($1, $2, $3) returning id",
    [therapist, startsAt.toISOString(), new Date(startsAt.getTime() + HOUR).toISOString()],
  );
  await t.asUser(t.users["scheduler1@example.test"], "insert into public.holds (slot_id, client_id) values ($1, $2)", [
    slot.id,
    client,
  ]);
}

const INSERT = "insert into public.client_insurance (client_id, status) values ($1, $2)";
// Саме цей запит надсилає дія: supabase.rpc("set_insurance_status", { p_client_id, p_status }) (design.md, рішення 2).
// Функція security invoker, тож політики insert / update таблиці діють і на її виклик.
const markAs = (user: string, client: string, status: string) =>
  t.asUser(user, "select public.set_insurance_status($1, $2)", [client, status]);

// Що бачить користувач у картці: рядок статусу клієнта (0 рядків — «Not set» або картку не видно).
const statusSeenBy = (user: string, client: string) =>
  t.asUser<{ status: string }>(user, "select status from public.client_insurance where client_id = $1", [client]);

// «Дано»: картка показує статус / «Not set» — стан ставимо в обхід RLS.
const given = (client: string, status: string) =>
  t.asService(`${INSERT} on conflict (client_id) do update set status = excluded.status`, [client, status]);
const givenNotSet = (client: string) =>
  t.asService("delete from public.client_insurance where client_id = $1", [client]);

// Відмова політики RLS (роль без права запису) і відмова GRANT (права на операцію немає взагалі).
const RLS_DENIED = {
  code: "42501",
  message: expect.stringContaining('row-level security policy for table "client_insurance"'),
};
const NO_PRIVILEGE = { code: "42501", message: expect.stringContaining("permission denied for table client_insurance") };

beforeAll(async () => {
  t = await createTestDb();
  admin1 = t.users["admin1@example.test"];
  scheduler1 = t.users["scheduler1@example.test"];
  scheduler2 = t.users["scheduler2@example.test"];
  therapist1 = t.users["therapist1@example.test"];
  await card("client6", "Client Six", "client6@example.test");
  await card("client7", "Client Seven", "client7@example.test");
  await card("client9", "Client Nine", "client9@example.test");
  // client6 — свій клієнт therapist1; client9 — клієнт therapist2, для therapist1 чужий.
  await holdFor(therapist1, ids.client6, inDays(7));
  await holdFor(t.users["therapist2@example.test"], ids.client9, inDays(7));
}, 60_000);

describe("статус перевірки страхування: бачать і позначають", () => {
  it("AC-INS-01: scheduler1 створив картку client6 — статусу ще ніхто не позначав, рядка немає («Not set»)", async () => {
    const [{ id }] = await t.asUser<{ id: string }>(
      scheduler1,
      `insert into public.clients (kind, full_name, email, birth_date, language)
       values ('adult', 'Client Six', 'client6.new@example.test', '1990-05-14', 'English') returning id`,
    );
    expect(await statusSeenBy(scheduler1, id)).toEqual([]);
    // «Not set» не зберігається рядком: його немає й у базі в обхід RLS.
    expect(await t.asService("select status from public.client_insurance where client_id = $1", [id])).toEqual([]);
    // Картки зрізу 1 із сиду (client1, client2) — так само «Not set».
    expect(
      await t.asUser(
        scheduler1,
        `select i.status from public.client_insurance as i join public.clients as c on c.id = i.client_id
         where c.email in ('client1@example.test', 'client2@example.test')`,
      ),
    ).toEqual([]);
  });

  it("AC-INS-02: scheduler1 позначає client6 «Verified» — і після повторного відкриття бачить «Verified»", async () => {
    await givenNotSet(ids.client6);
    expect(await statusSeenBy(scheduler1, ids.client6)).toEqual([]);
    await markAs(scheduler1, ids.client6, "verified");
    // Повторне відкриття картки — окремий запит після запису.
    expect(await statusSeenBy(scheduler1, ids.client6)).toEqual([{ status: "verified" }]);
  });

  it("AC-INS-03: admin1 змінює статус client7 з «Verified» на «Private pay» — і admin1, і scheduler2 бачать «Private pay»", async () => {
    await given(ids.client7, "verified");
    await markAs(admin1, ids.client7, "private_pay");
    expect(await statusSeenBy(admin1, ids.client7)).toEqual([{ status: "private_pay" }]);
    expect(await statusSeenBy(scheduler2, ids.client7)).toEqual([{ status: "private_pay" }]);
  });

  it("AC-INS-04: therapist1 бачить «Not accepted» у картці свого client6, а статусу чужого client9 — ні", async () => {
    await given(ids.client6, "not_accepted");
    // У client9 статус є, тож 0 рядків — відмова RLS, а не відсутність статусу.
    await given(ids.client9, "verified");
    expect(await statusSeenBy(therapist1, ids.client6)).toEqual([{ status: "not_accepted" }]);
    expect(await statusSeenBy(therapist1, ids.client9)).toEqual([]);
  });
});

describe("статус перевірки страхування: відмови в базі", () => {
  it("AC-INS-05: therapist1 напряму (функція, insert, update) змінює статус client6 на «Verified» — scheduler1 і далі бачить «Not accepted»", async () => {
    await given(ids.client6, "not_accepted");

    // Той самий виклик, що надсилає дія, — в обхід сторінок: відмовляє політика insert усередині функції.
    await expect(markAs(therapist1, ids.client6, "verified")).rejects.toMatchObject(RLS_DENIED);
    expect(await statusSeenBy(scheduler1, ids.client6)).toEqual([{ status: "not_accepted" }]);

    // insert без returning: відмовляє політика insert, а не select чи unique.
    await expect(t.asUser(therapist1, INSERT, [ids.client6, "verified"])).rejects.toMatchObject(RLS_DENIED);
    expect(await statusSeenBy(scheduler1, ids.client6)).toEqual([{ status: "not_accepted" }]);

    // Прямий update: політика update терапевта не пропускає — 0 рядків.
    expect(
      await t.asUser(
        therapist1,
        "update public.client_insurance set status = 'verified' where client_id = $1 returning client_id",
        [ids.client6],
      ),
    ).toEqual([]);
    expect(await statusSeenBy(scheduler1, ids.client6)).toEqual([{ status: "not_accepted" }]);
  });

  it("AC-INS-05: client6 ще «Not set» — виклик функції й прямий insert therapist1 відхилено, рядка статусу не з'явилось", async () => {
    await givenNotSet(ids.client6);
    await expect(markAs(therapist1, ids.client6, "verified")).rejects.toMatchObject(RLS_DENIED);
    await expect(t.asUser(therapist1, INSERT, [ids.client6, "verified"])).rejects.toMatchObject(RLS_DENIED);
    expect(await statusSeenBy(scheduler1, ids.client6)).toEqual([]);
  });

  it("AC-INS-06: без входу статус client6 не прочитати й не змінити, даних картки теж — scheduler1 бачить «Verified»", async () => {
    await given(ids.client6, "verified");
    await expect(
      t.asAnon("select full_name, email from public.clients where id = $1", [ids.client6]),
    ).rejects.toMatchObject({ code: "42501", message: expect.stringContaining("permission denied for table clients") });
    await expect(
      t.asAnon("select status from public.client_insurance where client_id = $1", [ids.client6]),
    ).rejects.toMatchObject(NO_PRIVILEGE);
    await expect(
      t.asAnon("update public.client_insurance set status = 'not_accepted' where client_id = $1", [ids.client6]),
    ).rejects.toMatchObject(NO_PRIVILEGE);
    await expect(t.asAnon(INSERT, [ids.client6, "not_accepted"])).rejects.toMatchObject(NO_PRIVILEGE);
    // Без revoke execute … from public функцію викликав би й anon (а відмовила б уже таблиця) — тож саме «function».
    await expect(
      t.asAnon("select public.set_insurance_status($1, $2)", [ids.client6, "not_accepted"]),
    ).rejects.toMatchObject({
      code: "42501",
      message: expect.stringContaining("permission denied for function set_insurance_status"),
    });
    expect(await statusSeenBy(scheduler1, ids.client6)).toEqual([{ status: "verified" }]);
  });

  it("«Not set» лише початковий: ні 'not_set', ні null, ні видалення рядка не повертають «Not set» (Припущення PM)", async () => {
    await given(ids.client7, "verified");
    for (const user of [scheduler1, admin1]) {
      await expect(markAs(user, ids.client7, "not_set")).rejects.toMatchObject({ code: "23514" });
      await expect(
        t.asUser(user, "update public.client_insurance set status = 'not_set' where client_id = $1", [ids.client7]),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        t.asUser(user, "update public.client_insurance set status = null where client_id = $1", [ids.client7]),
      ).rejects.toMatchObject({ code: "23502" });
      await expect(
        t.asUser(user, "delete from public.client_insurance where client_id = $1", [ids.client7]),
      ).rejects.toMatchObject(NO_PRIVILEGE);
    }
    expect(await statusSeenBy(scheduler1, ids.client7)).toEqual([{ status: "verified" }]);

    // Терапевт теж не видаляє статус свого клієнта.
    await given(ids.client6, "not_accepted");
    await expect(
      t.asUser(therapist1, "delete from public.client_insurance where client_id = $1", [ids.client6]),
    ).rejects.toMatchObject(NO_PRIVILEGE);
    expect(await statusSeenBy(scheduler1, ids.client6)).toEqual([{ status: "not_accepted" }]);

    // Позначити «Not set» не можна й першою позначкою.
    await givenNotSet(ids.client9);
    await expect(markAs(scheduler1, ids.client9, "not_set")).rejects.toMatchObject({ code: "23514" });
    await expect(t.asUser(scheduler1, INSERT, [ids.client9, "not_set"])).rejects.toMatchObject({ code: "23514" });
    expect(await t.asService("select status from public.client_insurance where client_id = $1", [ids.client9])).toEqual([]);
  });
});
