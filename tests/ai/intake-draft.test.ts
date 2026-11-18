// Правила чернетки картки, які перевіряє код, а не модель (design.md impl-client-intake-draft, рішення 2): модель
// повідомляє факти з тексту, draftFromModelText перетворює їх на поля форми, тип клієнта, перелік «Missing» і стан.
// Відповіді моделі тут написано руками — це тести правил коду; справжні відповіді моделі — у tests/golden.test.ts.
import { describe, expect, it } from "vitest";
import { draftFromModelText, intakeMessage } from "@/lib/ai/intake-draft";

const TODAY = "2026-11-13";

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
    const result = draftFromModelText(modelText(adult), TODAY);
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
    const result = draftFromModelText(modelText({ ...adult, written_by_parent: true }), TODAY);
    expect(result).toMatchObject({ values: { kind: "child", email: "" } });
  });

  it("AC-INTAKE-04: бракує дати народження й мови — порожні поля й «Missing» у порядку форми", () => {
    const result = draftFromModelText(
      modelText({ client_name: "Client Twelve", client_email: "client12@example.test" }),
      TODAY,
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
    const result = draftFromModelText(modelText({ birth_date: "1990-05-14", session_language: "English" }), TODAY);
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
    const noAt = draftFromModelText(modelText({ ...adult, client_email: "morgan.bell.example.test" }), TODAY);
    expect(noAt).toMatchObject({ status: "needs_info", missing: ["Email"], values: { email: "" } });
    const upper = draftFromModelText(modelText({ ...adult, client_email: "  Ellis.Reed@Example.TEST " }), TODAY);
    expect(upper).toMatchObject({ status: "ok", values: { email: "ellis.reed@example.test" } });
  });

  it("AC-INTAKE-04: 18 років рівно сьогодні — Adult, на день молодше — Child", () => {
    const born = (birth_date: string) => draftFromModelText(modelText({ ...adult, birth_date }), TODAY);
    expect(born("2008-11-13")).toMatchObject({ values: { kind: "adult" } });
    expect(born("2008-11-14")).toMatchObject({ values: { kind: "child" } });
  });

  it("AC-INTAKE-05: дата народження пізніша за сьогодні — поле порожнє й «Missing: Date of birth»", () => {
    const result = draftFromModelText(modelText({ ...adult, birth_date: "2027-01-05" }), TODAY);
    expect(result).toMatchObject({ status: "needs_info", missing: ["Date of birth"], values: { birth_date: "" } });
    expect(intakeMessage(result)).toBe("Draft is incomplete. Missing: Date of birth. Fill them in manually.");
  });

  it("AC-INTAKE-05: дата сьогодні — у чернетці; неіснуюча дата — порожня", () => {
    expect(draftFromModelText(modelText({ ...adult, birth_date: TODAY }), TODAY)).toMatchObject({
      values: { birth_date: TODAY },
    });
    expect(draftFromModelText(modelText({ ...adult, birth_date: "1990-02-30" }), TODAY)).toMatchObject({
      values: { birth_date: "" },
    });
  });

  it("AC-INTAKE-06: модель відмовила — без чернетки, «This text can't be used…»", () => {
    const result = draftFromModelText(modelText({ status: "refused" }), TODAY);
    expect(result).toEqual({ status: "refused" });
    expect(intakeMessage(result)).toBe(
      "This text can't be used to draft a client card. Paste the client's request or fill in the form manually.",
    );
  });

  it("AC-INTAKE-08: відповідь не JSON чи не за схемою — помічник недоступний, а не «майже чернетка»", () => {
    for (const text of ["not json", JSON.stringify({ status: "draft" }), modelText({ session_language: "French" })]) {
      const result = draftFromModelText(text, TODAY);
      expect(result).toEqual({ status: "unavailable", reason: "invalid_output" });
      expect(intakeMessage(result)).toBe("The assistant is unavailable right now. Fill in the form manually.");
    }
  });
});
