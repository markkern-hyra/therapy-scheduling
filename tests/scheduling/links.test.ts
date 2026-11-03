import { describe, expect, it } from "vitest";
import { scheduleHref, slotsHref } from "@/lib/scheduling/links";

describe("slotsHref: адреса дня на сторінці слотів", () => {
  it("терапевт і день — у параметрах; чого немає — того й у адресі немає", () => {
    expect(slotsHref("t1", "2026-10-27")).toBe("/slots?therapist=t1&day=2026-10-27");
    expect(slotsHref(undefined, "2026-10-27")).toBe("/slots?day=2026-10-27");
    expect(slotsHref("t1", undefined)).toBe("/slots?therapist=t1");
  });

  it("AC-CARD-02: пошук клієнта лишається в адресі після кроку днем чи «Hold»", () => {
    expect(slotsHref("t1", "2026-10-27", "guardian7@example.test")).toBe(
      "/slots?therapist=t1&day=2026-10-27&client=guardian7%40example.test",
    );
    expect(slotsHref("t1", "2026-10-27", "")).toBe("/slots?therapist=t1&day=2026-10-27");
  });
});

describe("scheduleHref: адреса тижня в розкладі", () => {
  it("AC-HOLD-31: понеділок тижня — у параметрі week", () => {
    expect(scheduleHref("2026-11-09")).toBe("/schedule?week=2026-11-09");
  });
});
