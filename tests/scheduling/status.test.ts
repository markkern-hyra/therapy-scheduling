import { describe, expect, it } from "vitest";
import { daySlotsView, slotStatus } from "@/lib/scheduling/status";

const slot = (startsAt: string) => ({ id: startsAt, starts_at: startsAt });

describe("status: слоти дня", () => {
  it("AC-HOLD-24: день без жодного слоту — лише повідомлення «No free slots on this day.» і жодного слоту", () => {
    expect(daySlotsView([], new Date("2026-11-05T17:00:00Z"))).toEqual({
      message: "No free slots on this day.",
      slots: [],
    });
  });

  it("слот, що вже почався (з моменту початку включно), має статус «Past»", () => {
    const now = new Date("2026-11-03T20:30:00Z"); // 12:30 за LA
    expect(slotStatus(slot("2026-11-03T18:00:00Z"), now)).toBe("Past");
    expect(slotStatus(slot("2026-11-03T20:30:00Z"), now)).toBe("Past");
    expect(slotStatus(slot("2026-11-03T21:00:00Z"), now)).toBe("free");
  });

  it("є вільний слот — повідомлення немає, слоти за часом зі статусами", () => {
    const now = new Date("2026-11-03T20:30:00Z");
    expect(daySlotsView([slot("2026-11-03T21:00:00Z"), slot("2026-11-03T18:00:00Z")], now)).toEqual({
      message: null,
      slots: [
        { ...slot("2026-11-03T18:00:00Z"), status: "Past" },
        { ...slot("2026-11-03T21:00:00Z"), status: "free" },
      ],
    });
  });

  it("лише слоти «Past» — повідомлення «No free slots on this day.» і всі слоти дня", () => {
    const now = new Date("2026-11-03T20:30:00Z");
    expect(daySlotsView([slot("2026-11-03T18:00:00Z")], now)).toEqual({
      message: "No free slots on this day.",
      slots: [{ ...slot("2026-11-03T18:00:00Z"), status: "Past" }],
    });
  });
});
