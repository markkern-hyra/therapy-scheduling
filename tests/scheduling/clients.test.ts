import { describe, expect, it } from "vitest";
import {
  canCreateCards,
  cardFields,
  cardFromForm,
  contactEmail,
  emptyClientsText,
  matchesClient,
  missingCardText,
  validateCard,
} from "@/lib/scheduling/clients";
import { errorCode, messageFor } from "@/lib/scheduling/messages";

// Нормалізація й перевірка форми, хто може створювати картку, і переклад помилки бази в текст PM (помилки — такі, як їх
// повертає PostgREST). Відмови самої бази — у tests/db.
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

  it("AC-CARD-02: у виборі клієнта під час утримання біля дитини — email опікуна, біля дорослого — власний", () => {
    expect(contactEmail({ kind: "child", email: null, guardian_email: "guardian7@example.test" })).toBe("guardian7@example.test");
    expect(contactEmail({ kind: "adult", email: "client6@example.test", guardian_email: null })).toBe("client6@example.test");
  });

  it("картки зрізу 1 (лише ім'я та email) — тип «Adult», відсутні поля «Not provided»", () => {
    expect(
      cardFields({ kind: "adult", email: "client1@example.test", birth_date: null, language: null, guardian_name: null, guardian_email: null }),
    ).toEqual({ type: "Adult", birthDate: "Not provided", language: "Not provided", contact: "client1@example.test" });
  });

  it("AC-CARD-13: база відхилила дублікат дитини — «A client with these details already exists.»", () => {
    expect(text({ code: "23505", message: 'duplicate key value violates unique constraint "clients_child_dedup_key"' })).toBe(
      "A client with these details already exists.",
    );
  });
});

describe("перевірка форми картки", () => {
  const TODAY = "2026-11-03";
  const texts = (values: Record<string, string>) =>
    Object.fromEntries(Object.entries(validateCard(values, TODAY)).map(([field, code]) => [field, messageFor(code)]));

  it("AC-CARD-12: порожнє ім'я, дата 2026-11-04, без мови — три помилки одразу, кожна біля свого поля", () => {
    expect(
      texts({
        kind: "child",
        full_name: "",
        birth_date: "2026-11-04",
        language: "",
        guardian_name: "Guardian Eight",
        guardian_email: "guardian8@example.test",
      }),
    ).toEqual({
      full_name: "Enter the client's name.",
      birth_date: "Enter a date of birth that is not in the future.",
      language: "Select a session language.",
    });
  });

  it("AC-CARD-12: дата народження, що дорівнює сьогоднішній, коректна, а порожня — ні", () => {
    expect(texts({ ...ADULT, birth_date: TODAY })).toEqual({});
    expect(texts({ ...ADULT, birth_date: "" })).toEqual({ birth_date: "Enter a date of birth that is not in the future." });
  });

  it("AC-CARD-12: дата не у форматі РРРР-ММ-ДД чи неможлива — та сама помилка біля поля", () => {
    for (const birth_date of ["12026-11-04", "1990-13-45", "not-a-date"]) {
      expect(texts({ ...ADULT, birth_date })).toEqual({ birth_date: "Enter a date of birth that is not in the future." });
    }
  });

  it("AC-CARD-12: тип не вибрано — «Select a client type.», поля контакту ще невідомі", () => {
    expect(texts({ full_name: "Client Six", birth_date: "1990-05-14", language: "English" })).toEqual({
      kind: "Select a client type.",
    });
  });

  it("AC-CARD-12: ім'я або email дорослого — одне повідомлення, під першим полем із помилкою", () => {
    const message = "Enter the client's name and a valid email.";
    expect(texts({ ...ADULT, full_name: "   " })).toEqual({ full_name: message });
    expect(texts({ ...ADULT, email: "client3example.test" })).toEqual({ email: message });
    expect(texts({ ...ADULT, full_name: "", email: "" })).toEqual({ full_name: message });
  });

  it("AC-HOLD-39: некоректний email дорослого — без крапки, два «@», порожня частина, пробіл", () => {
    for (const email of ["client3@example", "client3@@example.test", "@example.test", "client 3@example.test"]) {
      expect(texts({ ...ADULT, email })).toEqual({ email: "Enter the client's name and a valid email." });
    }
    expect(texts({ ...ADULT, email: " Client3@Example.TEST " })).toEqual({});
  });

  it("AC-CARD-03: ім'я або email опікуна — одне повідомлення, під першим полем із помилкою", () => {
    const message = "Enter the guardian's name and a valid email.";
    expect(texts({ ...CHILD, guardian_name: "" })).toEqual({ guardian_name: message });
    expect(texts({ ...CHILD, guardian_email: "guardian7" })).toEqual({ guardian_email: message });
    expect(texts({ ...CHILD, guardian_name: "", guardian_email: "" })).toEqual({ guardian_name: message });
  });

  it("AC-CARD-02: у дитини власний email не перевіряємо", () => {
    expect(texts({ ...CHILD, email: "not-an-email" })).toEqual({});
  });
});

describe("список клієнтів", () => {
  it("AC-CARD-09: у терапевта без своїх клієнтів — «No clients yet. Clients appear here when a scheduler holds a slot with you.»", () => {
    expect(emptyClientsText("therapist")).toBe(
      "No clients yet. Clients appear here when a scheduler holds a slot with you.",
    );
  });

  it("AC-CARD-15: у планувальника й адміністратора без карток — «No clients yet. Create a client card from an intake form.»", () => {
    expect(emptyClientsText("scheduler")).toBe("No clients yet. Create a client card from an intake form.");
    expect(emptyClientsText("admin")).toBe("No clients yet. Create a client card from an intake form.");
  });
});

describe("картка за посиланням, якої немає", () => {
  it("AC-CARD-16: планувальник і адміністратор — «This client card doesn't exist.», терапевт — відмова як для чужої картки", () => {
    expect(missingCardText("scheduler")).toBe("This client card doesn't exist.");
    expect(missingCardText("admin")).toBe("This client card doesn't exist.");
    expect(missingCardText("therapist")).toBe("You don't have access to this client.");
  });
});

describe("пошук клієнта під час утримання", () => {
  const seven = { full_name: "Client Seven", kind: "child", email: null, guardian_email: "guardian7@example.test" };
  const six = { full_name: "Client Six", kind: "adult", email: "client6@example.test", guardian_email: null };

  it("AC-CARD-02: дитину знаходять за email опікуна guardian7@example.test і за її ім'ям", () => {
    expect(matchesClient(seven, "guardian7@example.test")).toBe(true);
    expect(matchesClient(seven, " Client Seven ")).toBe(true);
    expect(matchesClient(six, "guardian7@example.test")).toBe(false);
  });

  it("AC-CARD-01: дорослого знаходять за ім'ям або email без урахування регістру", () => {
    expect(matchesClient(six, "CLIENT6@example.test")).toBe(true);
    expect(matchesClient(six, "six")).toBe(true);
    expect(matchesClient(seven, "client6")).toBe(false);
  });

  it("AC-CARD-01: запит не збігається через межу імені й email", () => {
    expect(matchesClient(six, "six client6")).toBe(false);
  });

  it("AC-CARD-02: порожній запит показує всіх клієнтів", () => {
    expect(matchesClient(seven, "")).toBe(true);
    expect(matchesClient(six, "   ")).toBe(true);
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
