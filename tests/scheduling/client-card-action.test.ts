import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClientCard } from "@/app/clients/actions";
import { messageFor } from "@/lib/scheduling/messages";

// Дія createClientCard без бази: роль і відповідь бази підставляємо через клієнт Supabase, перевіряємо, що дія робить до й після запису.
// Відмови самої бази (RLS, check) — у tests/db/client-cards.test.ts.
const h = vi.hoisted(() => ({
  role: "scheduler",
  dbError: null as { code: string; message: string } | null,
  data: null as { id: string } | null,
  insert: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
// Мокаємо лише клієнт Supabase: requireRole лишається справжнім.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "user-1", email: "scheduler1@example.test" } } }) },
    from: (table: string) =>
      table === "profiles"
        ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: h.role }, error: null }) }) }) }
        : table === "clients"
          ? { insert: h.insert }
          : {},
  }),
}));

const INITIAL = { error: null, errors: {}, values: {} };
const FIELDS = {
  kind: "child",
  full_name: "Client Eight",
  email: "",
  birth_date: "2016-01-10",
  language: "English",
  guardian_name: "",
  guardian_email: "",
};
const form = () => {
  const f = new FormData();
  for (const [name, value] of Object.entries(FIELDS)) f.set(name, value);
  f.set("$ACTION_ID_0123", ""); // службове поле React у формі до гідратації
  return f;
};

beforeEach(() => {
  h.insert.mockReset();
  h.revalidatePath.mockReset();
  h.data = null;
  h.insert.mockReturnValue({ select: () => ({ single: async () => ({ data: h.data, error: h.dbError }) }) });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createClientCard", () => {
  it("AC-CARD-01: картку записано з даних форми — список оновлено, перехід на сторінку нової картки", async () => {
    h.role = "scheduler";
    h.dbError = null;
    h.data = { id: "card-6" };
    const f = new FormData();
    for (const [name, value] of Object.entries({
      kind: "adult",
      full_name: "Client Six",
      email: "client6@example.test",
      birth_date: "1990-05-14",
      language: "English",
    }))
      f.set(name, value);
    const landing = await createClientCard(INITIAL, f).then(
      () => null,
      (e: { digest?: string }) => String(e.digest).split(";")[2],
    );
    expect(landing).toBe("/clients/card-6");
    expect(h.revalidatePath).toHaveBeenCalledWith("/clients");
    expect(h.insert).toHaveBeenCalledWith({
      kind: "adult",
      full_name: "Client Six",
      email: "client6@example.test",
      birth_date: "1990-05-14",
      language: "English",
      guardian_name: null,
      guardian_email: null,
    });
  });

  it("AC-CARD-03: порожні дані опікуна — повідомлення біля поля, без запису, введене лишається у формі", async () => {
    h.role = "scheduler";
    expect(await createClientCard(INITIAL, form())).toEqual({
      error: null,
      errors: { guardian_name: "GUARDIAN_INVALID", guardian_email: "GUARDIAN_INVALID" },
      values: FIELDS,
    });
    expect(h.insert).not.toHaveBeenCalled();
  });

  it("AC-CARD-12: три повідомлення біля полів, картку не створено, введене лишається у формі, а невибране — порожнє", async () => {
    h.role = "scheduler";
    vi.setSystemTime("2026-11-03T20:00:00Z"); // 12:00 у America/Los_Angeles
    // Браузер не надсилає вибраний вимкнений варіант-підказку мови, тому ключа language у FormData немає.
    const f = new FormData();
    for (const [name, value] of Object.entries({
      kind: "child",
      full_name: "",
      birth_date: "2026-11-04",
      guardian_name: "Guardian Eight",
      guardian_email: "guardian8@example.test",
    }))
      f.set(name, value);
    const state = await createClientCard(INITIAL, f);
    expect(Object.fromEntries(Object.entries(state.errors).map(([field, code]) => [field, messageFor(code)]))).toEqual({
      full_name: "Enter the client's name.",
      birth_date: "Enter a date of birth that is not in the future.",
      language: "Select a session language.",
    });
    expect(state.values).toEqual({
      kind: "child",
      full_name: "",
      email: "",
      birth_date: "2026-11-04",
      language: "",
      guardian_name: "Guardian Eight",
      guardian_email: "guardian8@example.test",
    });
    expect(h.insert).not.toHaveBeenCalled();
  });

  it("AC-CARD-13: база відхилила дублікат — «A client with these details already exists.», введене лишається у формі", async () => {
    h.role = "scheduler";
    h.dbError = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "clients_child_dedup_key"',
    };
    const values = { ...FIELDS, guardian_name: "Guardian Seven", guardian_email: "guardian7@example.test" };
    const f = form();
    f.set("guardian_name", values.guardian_name);
    f.set("guardian_email", values.guardian_email);
    expect(await createClientCard(INITIAL, f)).toEqual({ error: "CHILD_EXISTS", errors: {}, values });
  });

  it("AC-CARD-06: терапевт — «Only schedulers and admins can create client cards.» без спроби запису", async () => {
    h.role = "therapist";
    const state = await createClientCard(INITIAL, form());
    expect(state.error).toBe("CARD_FORBIDDEN");
    expect(state.values).toEqual(FIELDS);
    expect(h.insert).not.toHaveBeenCalled();
  });
});
