// WS11, B: тимчасовий маршрут для перевірки трекера помилок на staging. Навмисна помилка — лише для адміністратора;
// інші ролі requireRole відправляє на «/», без входу — на /login. Роль — з profiles (через клієнт Supabase), а не з JWT.
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ role: "admin" as string, signedIn: true }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: h.signedIn ? { claims: { sub: "user-1", email: "admin1@example.test" } } : null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: h.role }, error: null }) }) }) }),
  }),
}));

beforeEach(() => {
  h.role = "admin";
  h.signedIn = true;
});

const redirectTo = (error: unknown) => String((error as { digest?: string }).digest).split(";")[2];

describe("GET /api/ops/error-test", () => {
  it("адміністратор отримує навмисну помилку сервера (її ловить onRequestError)", async () => {
    const { GET } = await import("@/app/api/ops/error-test/route");
    await expect(GET()).rejects.toThrow("WS11: навмисна помилка для перевірки трекера помилок");
  });

  it("інші ролі й гості помилки не викликають — перенаправлення", async () => {
    const { GET } = await import("@/app/api/ops/error-test/route");
    for (const role of ["scheduler", "therapist"]) {
      h.role = role;
      expect(redirectTo(await GET().catch((e: unknown) => e))).toBe("/");
    }
    h.signedIn = false;
    expect(redirectTo(await GET().catch((e: unknown) => e))).toBe("/login");
  });
});
