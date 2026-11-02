import { describe, expect, it } from "vitest";
import { schedulerHolds, staffPageRefusal, therapistWeek } from "@/lib/scheduling/visibility";

// Час LA у «Дано» AC → UTC: у листопаді 2026 America/Los_Angeles = UTC−8.
const SLOT = "2026-11-05T18:00:00Z"; // 2026-11-05 10:00
const HELD_AT = "2026-11-02T22:30:00Z"; // 2026-11-02 14:30
const EXPIRES = "2026-11-03T22:30:00Z"; // 2026-11-03 14:30

const row = (id: string, client: string, over: Partial<{ slot_id: string; starts_at: string; created_at: string; expires_at: string; confirmed_at: string | null }> = {}) => ({
  id,
  client_id: client,
  slot_id: over.slot_id ?? "slot-1",
  created_at: over.created_at ?? HELD_AT,
  expires_at: over.expires_at ?? EXPIRES,
  confirmed_at: over.confirmed_at ?? null,
  slots: { starts_at: over.starts_at ?? SLOT },
});
const seen = (rows: ReturnType<typeof row>[], now: string) =>
  schedulerHolds(rows, new Date(now)).map((h) => [h.client_id, h.status]);

describe("список утримань планувальника", () => {
  it("AC-HOLD-05: о 2026-11-03 14:29 утримання ще «Held»", () => {
    expect(seen([row("h1", "client1")], "2026-11-03T22:29:00Z")).toEqual([["client1", "Held"]]);
  });

  it("AC-HOLD-06: о 2026-11-03 14:30 утримання «Expired»", () => {
    expect(seen([row("h1", "client1")], "2026-11-03T22:30:00Z")).toEqual([["client1", "Expired"]]);
  });

  it("AC-HOLD-20: о 2026-11-03 15:00 планувальник бачить утримання client1 зі статусом «Expired»", () => {
    expect(seen([row("h1", "client1")], "2026-11-03T23:00:00Z")).toEqual([["client1", "Expired"]]);
  });

  it("AC-HOLD-28: о 2026-11-05 09:59 прострочене утримання ще в списку", () => {
    expect(seen([row("h1", "client1")], "2026-11-05T17:59:00Z")).toEqual([["client1", "Expired"]]);
  });

  it("AC-HOLD-29: о 2026-11-05 10:00 прострочене утримання в списку не показано", () => {
    expect(seen([row("h1", "client1")], SLOT)).toEqual([]);
  });

  it("AC-HOLD-37: прострочене утримання client1 зникає, коли слот знову утримали за client1", () => {
    const again = row("h2", "client1", { created_at: "2026-11-03T23:00:00Z", expires_at: "2026-11-04T23:00:00Z" });
    expect(seen([row("h1", "client1"), again], "2026-11-03T23:00:00Z")).toEqual([["client1", "Held"]]);
  });

  it("AC-HOLD-28: новіше утримання того самого клієнта на іншому слоті не прибирає прострочений запис", () => {
    const elsewhere = row("h2", "client1", { slot_id: "slot-2", starts_at: "2026-11-06T18:00:00Z", created_at: "2026-11-03T23:00:00Z", expires_at: "2026-11-04T23:00:00Z" });
    expect(seen([row("h1", "client1"), elsewhere], "2026-11-03T23:00:00Z")).toEqual([
      ["client1", "Expired"],
      ["client1", "Held"],
    ]);
  });

  it("AC-HOLD-38: лише «Held» і «Expired» за часом слоту від найближчого, без сеансів", () => {
    const rows = [
      row("h1", "client1"),
      row("h2", "client2", { slot_id: "slot-2", starts_at: "2026-11-04T19:00:00Z", created_at: "2026-11-03T20:00:00Z", expires_at: "2026-11-04T20:00:00Z" }),
      row("h3", "client3", { slot_id: "slot-3", starts_at: "2026-11-04T20:00:00Z", confirmed_at: "2026-11-03T20:00:00Z" }),
      row("h4", "client4", { slot_id: "slot-4", starts_at: "2026-11-02T18:00:00Z", confirmed_at: "2026-11-01T20:00:00Z" }),
    ];
    expect(seen(rows, "2026-11-03T23:00:00Z")).toEqual([
      ["client2", "Held"],
      ["client1", "Expired"],
    ]);
  });

  it("AC-HOLD-42: о 2026-11-03 09:59 «Held» у списку, а з 10:00 — ні", () => {
    const rows = [row("h1", "client2", { starts_at: "2026-11-03T18:00:00Z" })];
    expect(seen(rows, "2026-11-03T17:59:00Z")).toEqual([["client2", "Held"]]);
    expect(seen(rows, "2026-11-03T18:00:00Z")).toEqual([]);
  });

  it("AC-HOLD-43: запис client1 «Expired» лишається поруч із «Held» client2 на тому самому слоті", () => {
    const other = row("h2", "client2", { created_at: "2026-11-03T22:45:00Z", expires_at: "2026-11-04T22:45:00Z" });
    // Той самий слот: новіше утримання — вище, порядок не змінюється між завантаженнями.
    expect(seen([row("h1", "client1"), other], "2026-11-03T23:00:00Z")).toEqual([
      ["client2", "Held"],
      ["client1", "Expired"],
    ]);
    expect(seen([row("h1", "client1"), other], SLOT)).toEqual([]);
  });
});

describe("сторінки планувальника за прямим посиланням", () => {
  it("AC-HOLD-44: терапевт бачить «Only schedulers and admins can view this page.», планувальник і адміністратор — сторінку", () => {
    expect(staffPageRefusal("therapist")).toBe("Only schedulers and admins can view this page.");
    expect(staffPageRefusal("scheduler")).toBeNull();
    expect(staffPageRefusal("admin")).toBeNull();
  });
});

describe("тиждень терапевта", () => {
  const slot = (starts_at: string, over: Partial<{ confirmed_at: string | null; expires_at: string | null; client_name: string | null }> = {}) => ({
    slot_id: starts_at,
    starts_at,
    ends_at: starts_at,
    confirmed_at: over.confirmed_at ?? null,
    expires_at: over.expires_at ?? null,
    client_name: over.client_name ?? null,
  });
  const NOW = new Date("2026-11-04T20:00:00Z"); // середа 2026-11-04 12:00 за LA

  it("AC-HOLD-30: тиждень за днями — статуси «Confirmed», «Held» і вільні за часом", () => {
    const week = therapistWeek(
      [
        slot("2026-11-06T18:00:00Z", { expires_at: "2026-11-05T20:00:00Z", client_name: "client1" }),
        slot("2026-11-02T18:00:00Z", { confirmed_at: "2026-11-01T20:00:00Z", expires_at: "2026-11-01T20:00:00Z", client_name: "client1" }),
        slot("2026-11-06T19:00:00Z"),
        slot("2026-11-06T20:00:00Z"),
      ],
      NOW,
    );
    expect(week.flatMap((d) => d.slots.map((s) => [s.starts_at, s.status]))).toEqual([
      ["2026-11-02T18:00:00Z", "Confirmed"],
      ["2026-11-06T18:00:00Z", "Held"],
      ["2026-11-06T19:00:00Z", "free"],
      ["2026-11-06T20:00:00Z", "free"],
    ]);
    expect(week.map((d) => d.day)).toEqual(["2026-11-02", "2026-11-06"]);
  });

  it("AC-HOLD-21: слот без утримання, що вже почався, — «Past», а ще не почався — вільний", () => {
    const week = therapistWeek([slot("2026-11-04T18:00:00Z"), slot("2026-11-05T18:00:00Z")], NOW);
    expect(week.flatMap((d) => d.slots.map((s) => s.status))).toEqual(["Past", "free"]);
  });

  it("утримання, слот якого почався, лишається «Held» до прострочення", () => {
    const week = therapistWeek([slot("2026-11-04T18:00:00Z", { expires_at: "2026-11-05T20:00:00Z", client_name: "client1" })], NOW);
    expect(week[0].slots[0].status).toBe("Held");
  });
});
