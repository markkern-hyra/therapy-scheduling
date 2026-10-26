import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClientCard } from "@/app/clients/actions";

// Дія createClientCard без Next і бази: роль і відповідь бази підставляємо, перевіряємо, що дія робить до й після запису.
// Відмови самої бази (RLS, check) — у tests/db/client-cards.test.ts.
const h = vi.hoisted(() => ({
  role: "scheduler",
  dbError: null as { code: string; message: string } | null,
  data: null as { id: string } | null,
  insert: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/auth/require-role", () => ({
  requireRole: async () => ({
    role: h.role,
    email: null,
    supabase: { from: () => ({ insert: h.insert }) },
  }),
}));

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
    const landing = await createClientCard({ error: null, values: {} }, f).then(
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

  it("AC-CARD-03: база відхилила дані опікуна — «Enter the guardian's name and a valid email.», введене лишається у формі", async () => {
    h.role = "scheduler";
    h.dbError = {
      code: "23514",
      message: 'new row for relation "clients" violates check constraint "clients_guardian_check"',
    };
    expect(await createClientCard({ error: null, values: {} }, form())).toEqual({
      error: "GUARDIAN_INVALID",
      values: FIELDS,
    });
  });

  it("AC-CARD-06: терапевт — «Only schedulers and admins can create client cards.» без спроби запису", async () => {
    h.role = "therapist";
    const state = await createClientCard({ error: null, values: {} }, form());
    expect(state.error).toBe("CARD_FORBIDDEN");
    expect(state.values).toEqual(FIELDS);
    expect(h.insert).not.toHaveBeenCalled();
  });
});
