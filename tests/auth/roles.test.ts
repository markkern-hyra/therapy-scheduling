import { expect, it } from "vitest";
import { toRole } from "@/lib/auth/roles";

it("роль з profiles.role поза admin / scheduler / therapist (наприклад, member до міграції) — немає ролі", () => {
  expect(toRole("member")).toBeNull();
  expect(toRole(undefined)).toBeNull();
  expect(toRole("scheduler")).toBe("scheduler");
});
