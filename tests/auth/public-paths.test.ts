import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/supabase/proxy";

describe("сторінки без входу", () => {
  it("вхід, auth і точний /api/health — публічні", () => {
    for (const path of ["/login", "/auth/callback", "/api/health"]) expect(isPublicPath(path)).toBe(true);
  });

  it("сусідні шляхи /api/health і дані клієнтів — лише після входу", () => {
    for (const path of ["/api/healthcheck", "/api/health/admin", "/clients", "/"]) expect(isPublicPath(path)).toBe(false);
  });
});
