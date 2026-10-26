import { describe, expect, it } from "vitest";
import { accessFor } from "@/lib/auth/access";
import { STAFF_ROLES } from "@/lib/auth/roles";

// Що робить requireRole на початку кожної сторінки й server action (proxy — лише UX).
describe("accessFor: хто проходить на сторінку чи в дію", () => {
  it("AC-CARD-07: без входу — на сторінку входу, для будь-якої сторінки", () => {
    expect(accessFor(false, null, STAFF_ROLES)).toBe("login");
    expect(accessFor(false, null, [])).toBe("login");
  });

  it("AC-CARD-11: увійшов без ролі — лише повідомлення про відсутній доступ, навіть там, де роль не потрібна", () => {
    expect(accessFor(true, null, [])).toBe("no-access");
    expect(accessFor(true, null, STAFF_ROLES)).toBe("no-access");
  });

  it("роль не з дозволених — на головну; дозволена чи будь-яка — проходить", () => {
    expect(accessFor(true, "therapist", STAFF_ROLES)).toBe("forbidden");
    expect(accessFor(true, "scheduler", STAFF_ROLES)).toBe("ok");
    expect(accessFor(true, "therapist", [])).toBe("ok");
  });
});
