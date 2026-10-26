import { describe, expect, it } from "vitest";
import { slotsHref } from "@/lib/scheduling/links";

describe("slotsHref: адреса дня на сторінці слотів", () => {
  it("терапевт і день — у параметрах; чого немає — того й у адресі немає", () => {
    expect(slotsHref("t1", "2026-10-27")).toBe("/slots?therapist=t1&day=2026-10-27");
    expect(slotsHref(undefined, "2026-10-27")).toBe("/slots?day=2026-10-27");
    expect(slotsHref("t1", undefined)).toBe("/slots?therapist=t1");
  });
});
