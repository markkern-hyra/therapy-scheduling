import { describe, expect, it } from "vitest";
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

  // Тексти нижче — справжні відмови Postgres, зняті запитами на PGlite зі всіма міграціями (tests/db/supabase-pglite.ts).
  const CARD_FORBIDDEN_TEXT = "Only schedulers and admins can create client cards.";

  it("AC-CARD-06: відмова в запису до іншої таблиці — не текст про картки клієнтів", () => {
    expect(messageFor(errorCode({ code: "42501", message: "permission denied for table slots" }))).not.toBe(CARD_FORBIDDEN_TEXT);
  });

  it("AC-CARD-06: помилка іншого коду зі згадкою таблиці clients — не текст про картки клієнтів", () => {
    expect(messageFor(errorCode({ code: "42P01", message: 'missing FROM-clause entry for table "clients"' }))).not.toBe(
      CARD_FORBIDDEN_TEXT,
    );
  });

  it("помилка, для якої немає правила PM, — UNKNOWN", () => {
    expect(errorCode({ code: "42501", message: "permission denied for table slots" })).toBe("UNKNOWN");
    expect(errorCode({ code: "42P01", message: 'missing FROM-clause entry for table "clients"' })).toBe("UNKNOWN");
  });

  it("назва обмеження в помилці, що не є його порушенням, — UNKNOWN, а не «A client with this email already exists.»", () => {
    expect(errorCode({ code: "42704", message: 'constraint "clients_email_key" of relation "clients" does not exist' })).toBe(
      "UNKNOWN",
    );
  });

  it("порушення без назви обмеження в тексті чи взагалі без тексту — UNKNOWN, а не виняток", () => {
    expect(errorCode({ code: "23514", message: "check violation" })).toBe("UNKNOWN");
    expect(errorCode({ code: "23505", message: "duplicate key" })).toBe("UNKNOWN");
    for (const code of ["P0001", "42501", "23505", "23514", "XX000"]) expect(errorCode({ code })).toBe("UNKNOWN");
  });
});
