import { describe, expect, it } from "vitest";
import { insuranceLine } from "@/lib/scheduling/insurance";

// Рядок статусу перевірки страхування в картці клієнта (зріз 3, impl-insurance-status, рішення 4): тексти — дослівно з
// «Тоді» AC. Рядка статусу в базі немає — null, тобто «Not set». Чи сторінка справді показує цей рядок — e2e.
describe("insuranceLine: рядок «Insurance: <статус>» у картці", () => {
  it("AC-INS-01: статус ще ніхто не позначав — «Insurance: Not set»", () => {
    expect(insuranceLine(null)).toBe("Insurance: Not set");
  });

  it("AC-INS-02: позначено «Verified» — «Insurance: Verified»", () => {
    expect(insuranceLine("verified")).toBe("Insurance: Verified");
  });

  it("AC-INS-03: змінено на «Private pay» — «Insurance: Private pay»", () => {
    expect(insuranceLine("private_pay")).toBe("Insurance: Private pay");
  });

  it("AC-INS-04: позначено «Not accepted» — «Insurance: Not accepted»", () => {
    expect(insuranceLine("not_accepted")).toBe("Insurance: Not accepted");
  });
});
