// Правила чернетки картки, які перевіряє код, а не модель (design.md impl-client-intake-draft, рішення 2): модель
// повідомляє факти з тексту, draftFromModelText перетворює їх на поля форми, тип клієнта, перелік «Missing» і стан.
// Відповіді моделі тут написано руками — це тести правил коду; справжні відповіді моделі — у tests/golden.test.ts.
import { describe, expect, it } from "vitest";
import { draftFromModelText, intakeMessage } from "@/lib/ai/intake-draft";

const TODAY = "2026-11-13";
// Текст звернення для тестів правил: у ньому є кожне ім'я й email, які «повертає модель» нижче (імена й email чернетки
// мають бути з тексту — Припущення PM). Окремі тести нижче перевіряють, що вигадане не потрапляє в чернетку.
const TEXT =
  "Client Ten client10@example.test · Client Eleven, Guardian Eleven guardian11@example.test · Client Twelve " +
  "client12@example.test · Rowan Lake rowan.lake@example.test · morgan.bell.example.test · Ellis.Reed@Example.TEST";

// Відповідь моделі за схемою: усі поля є, невідоме — null.
function modelText(facts: Record<string, unknown> = {}) {
  return JSON.stringify({
    status: "draft",
    client_name: null,
    birth_date: null,
    session_language: null,
    client_email: null,
    written_by_parent: false,
    guardian_name: null,
    guardian_email: null,
    ...facts,
  });
}

const adult = {
  client_name: "Client Ten",
  birth_date: "1990-05-14",
  session_language: "English",
  client_email: "client10@example.test",
};

describe("чернетка з тексту звернення", () => {
  it("AC-INTAKE-01: дорослий з усіма даними — поля форми й «Draft ready…»", () => {
    const result = draftFromModelText(modelText(adult), TODAY, TEXT);
    expect(result).toEqual({
      status: "ok",
      missing: [],
      values: {
        kind: "adult",
        full_name: "Client Ten",
        birth_date: "1990-05-14",
        language: "English",
        email: "client10@example.test",
        guardian_name: "",
        guardian_email: "",
      },
    });
    expect(intakeMessage(result)).toBe("Draft ready. Check the fields and create the card.");
  });

  it("AC-INTAKE-02: пише батько про свою дитину — тип Child, контакт опікуна, власного email немає", () => {
    const result = draftFromModelText(
      modelText({
        client_name: "Client Eleven",
        birth_date: "2016-09-03",
        session_language: "Spanish",
        written_by_parent: true,
        guardian_name: "Guardian Eleven",
        guardian_email: "guardian11@example.test",
      }),
      TODAY,
      TEXT,
    );
    expect(result).toMatchObject({
      status: "ok",
      values: {
        kind: "child",
        full_name: "Client Eleven",
        email: "",
        guardian_name: "Guardian Eleven",
        guardian_email: "guardian11@example.test",
      },
    });
    expect(intakeMessage(result)).toBe("Draft ready. Check the fields and create the card.");
  });

  it("AC-INTAKE-02: дорослий клієнт, але пише його батько — тип Child («або … або» з Припущень PM)", () => {
    const result = draftFromModelText(modelText({ ...adult, written_by_parent: true }), TODAY, TEXT);
    expect(result).toMatchObject({ values: { kind: "child", email: "" } });
  });

  it("AC-INTAKE-04: бракує дати народження й мови — порожні поля й «Missing» у порядку форми", () => {
    const result = draftFromModelText(
      modelText({ client_name: "Client Twelve", client_email: "client12@example.test" }),
      TODAY,
      TEXT,
    );
    expect(result).toMatchObject({
      status: "needs_info",
      missing: ["Date of birth", "Session language"],
      values: { kind: "adult", full_name: "Client Twelve", birth_date: "", language: "", email: "client12@example.test" },
    });
    expect(intakeMessage(result)).toBe(
      "Draft is incomplete. Missing: Date of birth, Session language. Fill them in manually.",
    );
  });

  it("AC-INTAKE-04: без імені й email — Name перед датою, Email останнім", () => {
    const result = draftFromModelText(modelText({ birth_date: "1990-05-14", session_language: "English" }), TODAY, TEXT);
    expect(result).toMatchObject({ status: "needs_info", missing: ["Name", "Email"] });
  });

  it("AC-INTAKE-04: 17-річний пише сам — тип Child, email клієнта не стає email опікуна", () => {
    const result = draftFromModelText(
      modelText({
        client_name: "Rowan Lake",
        birth_date: "2008-12-20",
        session_language: "English",
        client_email: "rowan.lake@example.test",
      }),
      TODAY,
      TEXT,
    );
    expect(result).toMatchObject({
      status: "needs_info",
      missing: ["Guardian name", "Guardian email"],
      values: { kind: "child", email: "", guardian_name: "", guardian_email: "" },
    });
    expect(intakeMessage(result)).toBe(
      "Draft is incomplete. Missing: Guardian name, Guardian email. Fill them in manually.",
    );
  });

  it("AC-INTAKE-04: email без «@» — поле порожнє й у «Missing»; email з великими літерами — малими", () => {
    const noAt = draftFromModelText(modelText({ ...adult, client_email: "morgan.bell.example.test" }), TODAY, TEXT);
    expect(noAt).toMatchObject({ status: "needs_info", missing: ["Email"], values: { email: "" } });
    const upper = draftFromModelText(modelText({ ...adult, client_email: "  Ellis.Reed@Example.TEST " }), TODAY, TEXT);
    expect(upper).toMatchObject({ status: "ok", values: { email: "ellis.reed@example.test" } });
  });

  it("AC-INTAKE-04: 18 років рівно сьогодні — Adult, на день молодше — Child", () => {
    const born = (birth_date: string) => draftFromModelText(modelText({ ...adult, birth_date }), TODAY, TEXT);
    expect(born("2008-11-13")).toMatchObject({ values: { kind: "adult" } });
    expect(born("2008-11-14")).toMatchObject({ values: { kind: "child" } });
  });

  it("AC-INTAKE-05: дата народження пізніша за сьогодні — поле порожнє й «Missing: Date of birth»", () => {
    const result = draftFromModelText(modelText({ ...adult, birth_date: "2027-01-05" }), TODAY, TEXT);
    expect(result).toMatchObject({ status: "needs_info", missing: ["Date of birth"], values: { birth_date: "" } });
    expect(intakeMessage(result)).toBe("Draft is incomplete. Missing: Date of birth. Fill them in manually.");
  });

  it("AC-INTAKE-05: дата сьогодні — у чернетці; неіснуюча дата — порожня", () => {
    expect(draftFromModelText(modelText({ ...adult, birth_date: TODAY }), TODAY, TEXT)).toMatchObject({
      values: { birth_date: TODAY },
    });
    expect(draftFromModelText(modelText({ ...adult, birth_date: "1990-02-30" }), TODAY, TEXT)).toMatchObject({
      values: { birth_date: "" },
    });
  });

  it("AC-INTAKE-06: модель відмовила — без чернетки, «This text can't be used…»", () => {
    const result = draftFromModelText(modelText({ status: "refused" }), TODAY, TEXT);
    expect(result).toEqual({ status: "refused" });
    expect(intakeMessage(result)).toBe(
      "This text can't be used to draft a client card. Paste the client's request or fill in the form manually.",
    );
  });

  it("AC-INTAKE-08: відповідь не JSON чи не за схемою — помічник недоступний, а не «майже чернетка»", () => {
    for (const text of ["not json", JSON.stringify({ status: "draft" }), modelText({ session_language: "French" })]) {
      const result = draftFromModelText(text, TODAY, TEXT);
      expect(result).toEqual({ status: "unavailable", reason: "invalid_output" });
      expect(intakeMessage(result)).toBe("The assistant is unavailable right now. Fill in the form manually.");
    }
  });

  it("AC-INTAKE-04: ім'я, якого немає в тексті, не потрапляє в чернетку — поле порожнє й у «Missing» (імен не вигадуємо)", () => {
    const text = "Hi, I'm Owen Marsh (owen.marsh@example.test). My son Leo was born on 2017-05-06, sessions in English.";
    const result = draftFromModelText(
      modelText({
        client_name: "Leo Marsh",
        birth_date: "2017-05-06",
        session_language: "English",
        written_by_parent: true,
        guardian_name: "Owen Marsh",
        guardian_email: "owen.marsh@example.test",
      }),
      TODAY,
      text,
    );
    expect(result).toMatchObject({ status: "needs_info", missing: ["Name"], values: { full_name: "", guardian_name: "Owen Marsh" } });
  });

  it("AC-INTAKE-04: email, якого немає в тексті, не потрапляє в чернетку — поле порожнє й у «Missing»", () => {
    const text = "I'm Client Ten, born on 1990-05-14, sessions in English.";
    const result = draftFromModelText(modelText(adult), TODAY, text);
    expect(result).toMatchObject({ status: "needs_info", missing: ["Email"], values: { full_name: "Client Ten", email: "" } });
  });

  it("AC-INTAKE-01: ім'я з тексту впізнаємо без різниці в регістрі, пробілах і апострофі (’ чи ')", () => {
    const text = "Hello, I’m ROSE   O’NEIL, rose.oneil@example.test, born 1990-05-14, sessions in English.";
    const result = draftFromModelText(
      modelText({ ...adult, client_name: "Rose O'Neil", client_email: "rose.oneil@example.test" }),
      TODAY,
      text,
    );
    expect(result).toMatchObject({ status: "ok", values: { full_name: "Rose O'Neil" } });
  });

  it("AC-INTAKE-04: рік народження з нулями попереду (0005) — дорослий, не дитина", () => {
    expect(draftFromModelText(modelText({ ...adult, birth_date: "0005-05-14" }), TODAY, TEXT)).toMatchObject({
      values: { kind: "adult" },
    });
  });
});
