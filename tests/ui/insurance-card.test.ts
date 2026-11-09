// Картка статусу страхування (зріз 3, design.md impl-insurance-status, «UI і компоненти»): що бачить роль у розмітці.
// Рендер на сервері, як у застосунку (серверний компонент): форма позначки — лише для admin і scheduler, повідомлення
// дії — лише над формою. Що відмовляє база й дія — tests/db/insurance.test.ts, tests/scheduling/insurance-action.test.ts.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InsuranceCard } from "@/app/_components/insurance-card";

const CLIENT6 = "c0000000-0000-4000-8000-000000000006";
const render = (props: { status: string | null; canMark: boolean; notice?: string; error?: string }) =>
  renderToStaticMarkup(
    createElement(InsuranceCard, {
      clientId: CLIENT6,
      insurance: props.status ? { status: props.status } : null,
      canMark: props.canMark,
      notice: props.notice,
      error: props.error,
    }),
  );

describe("InsuranceCard", () => {
  it("AC-INS-04: терапевт бачить «Insurance: Not accepted», а змінити статус йому не запропоновано", () => {
    const html = render({ status: "not_accepted", canMark: false });
    expect(html).toContain("Insurance: Not accepted");
    expect(html).not.toContain("<form");
    expect(html).not.toContain('type="radio"');
    expect(html).not.toContain("Save insurance status");
  });

  it("AC-INS-04: навіть з ?notice= і ?error= в адресі терапевт не бачить повідомлень дії", () => {
    const html = render({ status: "not_accepted", canMark: false, notice: "INSURANCE_SAVED", error: "UNKNOWN" });
    expect(html).not.toContain("Insurance status saved.");
    expect(html).not.toContain('role="alert"');
  });

  it("AC-INS-02: після збереження планувальник бачить «Insurance status saved.» і «Insurance: Verified»", () => {
    const html = render({ status: "verified", canMark: true, notice: "INSURANCE_SAVED" });
    // Повідомлення — у власному role="status" (у SubmitButton є ще один, порожній — для стану надсилання).
    expect(html).toMatch(/<p role="status"[^>]*>.*?Insurance status saved\.<\/span><\/p>/);
    expect(html).toContain("Insurance: Verified");
  });

  it("AC-INS-01: планувальник бачить «Insurance: Not set» і три варіанти позначки, жоден не обрано", () => {
    const html = render({ status: null, canMark: true });
    expect(html).toContain("Insurance: Not set");
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    expect(html).not.toMatch(/ checked=""/);
    for (const label of ["Verified", "Not accepted", "Private pay"]) expect(html).toContain(label);
    expect(html).toContain("Save insurance status");
  });

  it("запис не вдався — над формою текст помилки, без «Insurance status saved.»", () => {
    const html = render({ status: "verified", canMark: true, error: "UNKNOWN" });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Something went wrong. Try again.");
    expect(html).not.toContain("Insurance status saved.");
  });
});
