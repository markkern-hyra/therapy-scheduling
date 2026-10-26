import { describe, expect, it } from "vitest";
import { daySlotsView, holdStatus, isHoldable, slotStatus } from "@/lib/scheduling/status";

type Hold = { confirmed_at: string | null; expires_at: string };
const slot = (startsAt: string, holds: Hold[] = []) => ({ id: startsAt, starts_at: startsAt, holds });
const held = (expiresAt: string): Hold => ({ confirmed_at: null, expires_at: expiresAt });
const confirmed = (at: string): Hold => ({ confirmed_at: at, expires_at: at });

describe("status: утримання", () => {
  it("AC-HOLD-02: утримання до прострочення — «Held», після — «Expired», підтверджене — «Confirmed»", () => {
    const hold = held("2026-11-03T22:30:00Z"); // Held until 2026-11-03 14:30 за LA
    expect(holdStatus(hold, new Date("2026-11-03T22:29:00Z"))).toBe("Held");
    expect(holdStatus(hold, new Date("2026-11-03T22:30:00Z"))).toBe("Expired");
    expect(holdStatus(confirmed("2026-11-03T09:00:00Z"), new Date("2026-11-10T00:00:00Z"))).toBe("Confirmed");
  });
});

describe("status: слоти дня", () => {
  it("AC-HOLD-01: зараз 2026-11-02 09:00 — 10:00 вільний, 11:00 «Held», 12:00 «Confirmed», утримати можна лише 10:00", () => {
    const now = new Date("2026-11-02T17:00:00Z");
    const view = daySlotsView(
      // навмисно не за часом — перевіряє й сортування
      [
        slot("2026-11-03T20:00:00Z", [confirmed("2026-11-02T16:00:00Z")]),
        slot("2026-11-03T18:00:00Z"),
        slot("2026-11-03T19:00:00Z", [held("2026-11-03T00:00:00Z")]),
      ],
      now,
    );
    expect(view.message).toBeNull();
    expect(view.slots.map((s) => s.status)).toEqual(["free", "Held", "Confirmed"]);
    expect(view.slots.filter((s) => isHoldable(s.status)).map((s) => s.starts_at)).toEqual(["2026-11-03T18:00:00Z"]);
  });

  it("AC-HOLD-18: усі слоти дня «Held» або «Confirmed» — «No free slots on this day.» і обидва слоти зі статусами", () => {
    const now = new Date("2026-11-03T17:00:00Z");
    const view = daySlotsView(
      [
        slot("2026-11-04T18:00:00Z", [held("2026-11-04T10:00:00Z")]),
        slot("2026-11-04T19:00:00Z", [confirmed("2026-11-03T16:00:00Z")]),
      ],
      now,
    );
    expect(view.message).toBe("No free slots on this day.");
    expect(view.slots.map((s) => s.status)).toEqual(["Held", "Confirmed"]);
  });

  it("AC-HOLD-24: день без жодного слоту — лише повідомлення «No free slots on this day.» і жодного слоту", () => {
    expect(daySlotsView([], new Date("2026-11-05T17:00:00Z"))).toEqual({
      message: "No free slots on this day.",
      slots: [],
    });
  });

  it("AC-HOLD-32: зараз 12:30 — вільний 10:00 і 11:00 з простроченим утриманням мають «Past» і не утримуються", () => {
    const now = new Date("2026-11-03T20:30:00Z");
    const view = daySlotsView(
      [slot("2026-11-03T18:00:00Z"), slot("2026-11-03T19:00:00Z", [held("2026-11-03T10:00:00Z")])],
      now,
    );
    expect(view.slots.map((s) => s.status)).toEqual(["Past", "Past"]);
    expect(view.slots.some((s) => isHoldable(s.status))).toBe(false);
  });

  it("AC-HOLD-33: «Past» не рахуються вільними — «No free slots on this day.» і всі чотири слоти", () => {
    const now = new Date("2026-11-03T20:30:00Z");
    const view = daySlotsView(
      [
        slot("2026-11-03T18:00:00Z"),
        slot("2026-11-03T19:00:00Z"),
        slot("2026-11-03T21:00:00Z", [held("2026-11-04T10:00:00Z")]),
        slot("2026-11-03T22:00:00Z", [confirmed("2026-11-03T16:00:00Z")]),
      ],
      now,
    );
    expect(view.message).toBe("No free slots on this day.");
    expect(view.slots.map((s) => s.status)).toEqual(["Past", "Past", "Held", "Confirmed"]);
  });

  it("слот, що вже почався (з моменту початку включно), без активного утримання — «Past»", () => {
    const now = new Date("2026-11-03T20:30:00Z");
    expect(slotStatus(slot("2026-11-03T20:30:00Z"), now)).toBe("Past");
    expect(slotStatus(slot("2026-11-03T21:00:00Z"), now)).toBe("free");
  });

  it("активне утримання лишається «Held» і після початку слоту — до прострочення", () => {
    const now = new Date("2026-11-03T20:30:00Z");
    expect(slotStatus(slot("2026-11-03T18:00:00Z", [held("2026-11-03T22:30:00Z")]), now)).toBe("Held");
  });

  it("у слоті показано активне утримання, а не прострочене", () => {
    const now = new Date("2026-11-03T17:00:00Z");
    const active = held("2026-11-04T17:00:00Z");
    const [view] = daySlotsView([slot("2026-11-05T18:00:00Z", [held("2026-11-03T10:00:00Z"), active])], now).slots;
    expect(view.hold).toBe(active);
  });
});
