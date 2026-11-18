// Форма нової картки з полем звернення (зріз 4, design.md impl-client-intake-draft, «UI і компоненти»): що бачить
// планувальник у розмітці. Рендер на сервері, як перший показ сторінки. Що робить дія чернетки —
// tests/scheduling/intake-action.test.ts.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ClientCardForm } from "@/app/_components/client-card-form";
import { NewClientForm } from "@/app/_components/new-client-form";

// server-only кидає виняток поза серверним кодом Next.js; дію тут не викликаємо, лише рендеримо форму.
vi.mock("server-only", () => ({}));

const TODAY = "2026-11-13";

describe("форма нової картки з чернеткою", () => {
  it("AC-INTAKE-01: поля чернетки дорослого стоять у формі — тип Adult, Name, дата, мова, Email", () => {
    const html = renderToStaticMarkup(
      createElement(ClientCardForm, {
        today: TODAY,
        initial: {
          kind: "adult",
          full_name: "Client Ten",
          birth_date: "1990-05-14",
          language: "English",
          email: "client10@example.test",
          guardian_name: "",
          guardian_email: "",
        },
      }),
    );
    expect(html).toMatch(/<input[^>]*id="kind-adult"[^>]*checked=""/);
    expect(html).toMatch(/Name<input[^>]*name="full_name"[^>]*value="Client Ten"/);
    expect(html).toMatch(/name="birth_date"[^>]*value="1990-05-14"/);
    expect(html).toMatch(/<option value="English" selected="">/);
    expect(html).toMatch(/name="email"[^>]*value="client10@example.test"/);
  });

  it("AC-INTAKE-02: поля чернетки дитини — тип Child і контакт опікуна", () => {
    const html = renderToStaticMarkup(
      createElement(ClientCardForm, {
        today: TODAY,
        initial: { kind: "child", full_name: "Client Eleven", guardian_name: "Guardian Eleven", guardian_email: "guardian11@example.test" },
      }),
    );
    expect(html).toMatch(/<input[^>]*id="kind-child"[^>]*checked=""/);
    expect(html).toMatch(/name="guardian_name"[^>]*value="Guardian Eleven"/);
    expect(html).toMatch(/name="guardian_email"[^>]*value="guardian11@example.test"/);
  });

  it("AC-INTAKE-06: поле звернення до 2000 символів, підказка дослівно, кнопка чернетки — не головна дія", () => {
    const html = renderToStaticMarkup(createElement(NewClientForm, { today: TODAY }));
    expect(html).toMatch(/<textarea[^>]*name="intake_text"[^>]*maxLength="2000"/);
    expect(html).toContain(
      "Don&#x27;t paste diagnoses or other health details: name, date of birth, language and contacts are enough.",
    );
    expect(html).toContain("Draft card");
    // Головна дія екрана лишається одна — «Create client» (DESIGN.md: одна primary-кнопка).
    expect(html.match(/bg-primary /g)).toHaveLength(1);
    // Повідомлення чернетки до першого запиту немає.
    expect(html).not.toContain('role="alert"');
  });
});
