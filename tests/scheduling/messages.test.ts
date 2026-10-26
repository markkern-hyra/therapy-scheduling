import { describe, expect, it, vi } from "vitest";
import { runAction } from "@/lib/actions";

// revalidatePath потребує контексту запиту Next; тут перевіряємо лише адресу повернення.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { errorCode, messageFor } from "@/lib/scheduling/messages";

// Помилки такі, як їх повертає PostgREST: raise exception '<КОД>' → code P0001, message — код; порушення обмежень —
// code 23505 / 23514 і назва обмеження в message.
const raised = (code: string) => ({ code: "P0001", message: code });
const constraint = (code: string, name: string) => ({ code, message: `violates constraint "${name}"` });

describe("messages: код помилки бази → текст PM", () => {
  it("AC-HOLD-03: SLOT_TAKEN — «This slot is no longer available.»", () => {
    expect(messageFor(errorCode(raised("SLOT_TAKEN")))).toBe("This slot is no longer available.");
  });

  it("AC-HOLD-07: SLOT_STARTED — «This slot has already started and cannot be held.»", () => {
    expect(messageFor(errorCode(raised("SLOT_STARTED")))).toBe("This slot has already started and cannot be held.");
  });

  it("AC-HOLD-08: HOLD_FORBIDDEN — «Only schedulers and admins can hold slots.»", () => {
    expect(messageFor(errorCode(raised("HOLD_FORBIDDEN")))).toBe("Only schedulers and admins can hold slots.");
  });

  it("AC-HOLD-25: CLIENT_BUSY — «This client already has a hold or session at this time.»", () => {
    expect(messageFor(errorCode(raised("CLIENT_BUSY")))).toBe("This client already has a hold or session at this time.");
  });

  it("невідомий код із бази — UNKNOWN, а не текст Postgres", () => {
    expect(errorCode(raised("SOMETHING_ELSE"))).toBe("UNKNOWN");
  });

  it("порушення обмеження впізнаємо за назвою, а не лише за кодом", () => {
    expect(errorCode(constraint("23505", "clients_email_key"))).toBe("CLIENT_EXISTS");
    expect(errorCode(constraint("23514", "clients_full_name_check"))).toBe("CLIENT_INVALID");
    expect(errorCode(constraint("23514", "clients_email_check"))).toBe("CLIENT_INVALID");
    expect(errorCode(constraint("23505", "slots_therapist_starts_key"))).toBe("UNKNOWN");
    expect(errorCode(constraint("23514", "slots_duration_check"))).toBe("UNKNOWN");
  });
});

describe("runAction: повернення на сторінку з параметрами", () => {
  async function landing(back: string, error: { code: string; message: string } | null) {
    try {
      await runAction(Promise.resolve({ error }), back);
    } catch (e) {
      return String((e as { digest?: string }).digest).split(";")[2];
    }
    throw new Error("runAction did not redirect");
  }

  it("помилка додається до наявних параметрів адреси", async () => {
    expect(await landing("/slots?therapist=t1&day=2026-11-03", raised("SLOT_TAKEN"))).toBe(
      "/slots?therapist=t1&day=2026-11-03&error=SLOT_TAKEN",
    );
  });

  it("після успіху — та сама адреса без помилки", async () => {
    expect(await landing("/slots?therapist=t1&day=2026-11-03&error=SLOT_TAKEN", null)).toBe(
      "/slots?therapist=t1&day=2026-11-03",
    );
  });
});
