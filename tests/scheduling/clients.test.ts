import { describe, expect, it } from "vitest";
import { canCreateCards, cardFields, cardFromForm } from "@/lib/scheduling/clients";
import { errorCode, messageFor } from "@/lib/scheduling/messages";

// Правила картки (обов'язкові поля, формат і унікальність email, дані опікуна) перевіряє база — тут лише нормалізація
// форми, хто може створювати картку, і переклад помилки бази в текст PM (помилки — такі, як їх повертає PostgREST).
const violation = (code: string, constraint: string) => ({
  code,
  message: `new row for relation "clients" violates check constraint "${constraint}"`,
});
const text = (error: { code: string; message: string }) => messageFor(errorCode(error));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const ADULT = { kind: "adult", full_name: "Client Six", email: "client6@example.test", birth_date: "1990-05-14", language: "English" };
const CHILD = {
  kind: "child",
  full_name: "Client Seven",
  birth_date: "2015-03-02",
  language: "Spanish",
  guardian_name: "Guardian Seven",
  guardian_email: "guardian7@example.test",
};

describe("картка з анкети", () => {
  it("AC-CARD-01: картка дорослого — тип, ім'я, email, дата народження й мова, без опікуна", () => {
    expect(cardFromForm(form(ADULT))).toEqual({ ...ADULT, guardian_name: null, guardian_email: null });
  });

  it("AC-CARD-02: картка дитини — без власного email, з ім'ям і email опікуна", () => {
    expect(cardFromForm(form({ ...CHILD, email: "ignored@example.test" }))).toEqual({ ...CHILD, email: null });
  });

  it("AC-CARD-03: база відхилила дані опікуна — «Enter the guardian's name and a valid email.»", () => {
    expect(cardFromForm(form({ ...CHILD, guardian_name: "  ", guardian_email: "" }))).toMatchObject({
      guardian_name: "",
      guardian_email: "",
    });
    expect(text(violation("23514", "clients_guardian_check"))).toBe("Enter the guardian's name and a valid email.");
  });

  it("AC-CARD-06: створювати картки можуть лише admin і scheduler; терапевт бачить «Only schedulers and admins can create client cards.»", () => {
    expect(canCreateCards("admin")).toBe(true);
    expect(canCreateCards("scheduler")).toBe(true);
    expect(canCreateCards("therapist")).toBe(false);
    expect(canCreateCards(null)).toBe(false);
    expect(messageFor("CARD_FORBIDDEN")).toBe("Only schedulers and admins can create client cards.");
    expect(
      text({ code: "42501", message: 'new row violates row-level security policy for table "clients"' }),
    ).toBe("Only schedulers and admins can create client cards.");
  });

  it("AC-CARD-01: у картці дорослого показано тип, дату народження, мову й email", () => {
    expect(cardFields({ ...ADULT, guardian_name: null, guardian_email: null })).toEqual({
      type: "Adult",
      birthDate: "1990-05-14",
      language: "English",
      contact: "client6@example.test",
    });
  });

  it("AC-CARD-02: у картці дитини контакт — ім'я й email опікуна", () => {
    expect(cardFields({ ...CHILD, email: null }).contact).toBe("Guardian Seven — guardian7@example.test");
    expect(cardFields({ ...CHILD, email: null }).type).toBe("Child");
  });

  it("картки зрізу 1 (лише ім'я та email) — тип «Adult», відсутні поля «Not provided»", () => {
    expect(
      cardFields({ kind: "adult", email: "client1@example.test", birth_date: null, language: null, guardian_name: null, guardian_email: null }),
    ).toEqual({ type: "Adult", birthDate: "Not provided", language: "Not provided", contact: "client1@example.test" });
  });

  it("дата народження чи мова не задані або дата в майбутньому — тимчасовий текст до відповіді PM (#21)", () => {
    expect(text(violation("23514", "clients_intake_check"))).toBe(
      "Enter a date of birth that is not in the future and choose a session language.",
    );
  });
});

describe("правила картки зрізу 1 у формі анкети", () => {
  it("AC-HOLD-10: ім'я та email дорослого з форми стають новим рядком клієнта", () => {
    expect(cardFromForm(form({ ...ADULT, full_name: "Client Three", email: "client3@example.test" }))).toMatchObject({
      full_name: "Client Three",
      email: "client3@example.test",
    });
  });

  it("AC-HOLD-11: порожнє ім'я — «Enter the client's name and a valid email.»", () => {
    expect(cardFromForm(form({ ...ADULT, full_name: "   " })).full_name).toBe("");
    expect(text(violation("23514", "clients_full_name_check"))).toBe("Enter the client's name and a valid email.");
  });

  it("AC-HOLD-15: email без @ — «Enter the client's name and a valid email.»", () => {
    expect(text(violation("23514", "clients_email_check"))).toBe("Enter the client's name and a valid email.");
    expect(text(violation("23514", "clients_contact_check"))).toBe("Enter the client's name and a valid email.");
  });

  it("AC-HOLD-16: той самий email — «A client with this email already exists.»", () => {
    expect(
      text({ code: "23505", message: 'duplicate key value violates unique constraint "clients_email_key"' }),
    ).toBe("A client with this email already exists.");
  });

  it("AC-HOLD-34: « Client1@Example.TEST » — той самий email, що client1@example.test", () => {
    expect(cardFromForm(form({ ...ADULT, email: " Client1@Example.TEST " })).email).toBe("client1@example.test");
  });

  it("AC-HOLD-35: email і ім'я зберігаються без пробілів по краях, email — малими літерами", () => {
    expect(cardFromForm(form({ ...ADULT, full_name: " Client Three ", email: " Client3@Example.TEST " }))).toMatchObject(
      { full_name: "Client Three", email: "client3@example.test" },
    );
  });

  it("невідомий код у ?error= не показує нічого", () => {
    expect(messageFor("<b>hi</b>")).toBeUndefined();
    expect(messageFor(null)).toBeUndefined();
  });
});
