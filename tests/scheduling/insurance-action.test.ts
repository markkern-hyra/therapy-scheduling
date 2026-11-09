import { beforeEach, describe, expect, it, vi } from "vitest";
import { setInsuranceStatus } from "@/app/clients/actions";
import { messageFor } from "@/lib/scheduling/messages";

// Дія setInsuranceStatus без бази: роль і відповідь бази підставляємо через клієнт Supabase, перевіряємо, хто пише і
// куди дія повертає. Відмови самої бази (RLS, GRANT) — у tests/db/insurance.test.ts; що бачить людина — e2e.
const h = vi.hoisted(() => ({
  role: "scheduler",
  dbError: null as { code: string; message: string } | null,
  rpc: vi.fn(),
  upsert: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
// Мокаємо лише клієнт Supabase: requireRole (getClaims + роль із profiles) лишається справжнім.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "user-1", email: "user1@example.test" } } }) },
    // Запис статусу — функція бази set_insurance_status (design.md, рішення 2).
    rpc: h.rpc,
    from: (table: string) =>
      table === "profiles"
        ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: h.role }, error: null }) }) }) }
        : table === "client_insurance"
          ? { upsert: h.upsert, insert: h.insert, update: h.update }
          : {},
  }),
}));

const CLIENT6 = "c0000000-0000-4000-8000-000000000006";
const CLIENT7 = "c0000000-0000-4000-8000-000000000007";

const form = (clientId: string, status: string) => {
  const f = new FormData();
  f.set("client_id", clientId);
  f.set("status", status);
  return f;
};

// redirect() кидає NEXT_REDIRECT; адреса переходу — третя частина digest («NEXT_REDIRECT;replace;<адреса>;307;»).
const landing = (f: FormData) =>
  setInsuranceStatus(f).then(
    () => null,
    (e: { digest?: string }) => String(e.digest).split(";")[2],
  );
const noticeText = (to: string | null) => messageFor(new URL(String(to), "http://local").searchParams.get("notice"));

beforeEach(() => {
  for (const spy of [h.rpc, h.upsert, h.insert, h.update, h.revalidatePath]) spy.mockReset();
  h.dbError = null;
  h.rpc.mockImplementation(async () => ({ data: null, error: h.dbError }));
});

describe("setInsuranceStatus", () => {
  it("AC-INS-02: scheduler1 позначає client6 «Verified» — статус записано, на картці «Insurance status saved.»", async () => {
    h.role = "scheduler";
    const to = await landing(form(CLIENT6, "verified"));
    expect(h.rpc).toHaveBeenCalledTimes(1);
    expect(h.rpc.mock.calls[0].slice(0, 2)).toEqual([
      "set_insurance_status",
      { p_client_id: CLIENT6, p_status: "verified" },
    ]);
    expect(to).toBe(`/clients/${CLIENT6}?notice=INSURANCE_SAVED`);
    expect(noticeText(to)).toBe("Insurance status saved.");
    // Повторне відкриття картки бере свіжі дані.
    expect(h.revalidatePath).toHaveBeenCalledWith(`/clients/${CLIENT6}`);
  });

  it("AC-INS-03: admin1 змінює статус client7 на «Private pay» — статус записано, на картці «Insurance status saved.»", async () => {
    h.role = "admin";
    const to = await landing(form(CLIENT7, "private_pay"));
    expect(h.rpc).toHaveBeenCalledTimes(1);
    expect(h.rpc.mock.calls[0].slice(0, 2)).toEqual([
      "set_insurance_status",
      { p_client_id: CLIENT7, p_status: "private_pay" },
    ]);
    expect(to).toBe(`/clients/${CLIENT7}?notice=INSURANCE_SAVED`);
    expect(noticeText(to)).toBe("Insurance status saved.");
    expect(h.revalidatePath).toHaveBeenCalledWith(`/clients/${CLIENT7}`);
  });

  it("AC-INS-05: therapist1 надсилає форму статусу client6 напряму — жодного запису, назад на картку без «Insurance status saved.»", async () => {
    h.role = "therapist";
    const to = await landing(form(CLIENT6, "verified"));
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.upsert).not.toHaveBeenCalled();
    expect(h.insert).not.toHaveBeenCalled();
    expect(h.update).not.toHaveBeenCalled();
    expect(to).toBe(`/clients/${CLIENT6}`);
  });

  it("база відхилила запис — назад на картку з текстом помилки, без «Insurance status saved.»", async () => {
    h.role = "scheduler";
    h.dbError = { code: "42501", message: 'new row violates row-level security policy for table "client_insurance"' };
    const url = new URL(String(await landing(form(CLIENT6, "verified"))), "http://local");
    expect(url.pathname).toBe(`/clients/${CLIENT6}`);
    expect(url.searchParams.get("notice")).toBeNull();
    expect(messageFor(url.searchParams.get("error"))).toEqual(expect.any(String));
  });
});
