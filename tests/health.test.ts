// D0: /api/health відрізняє «база відповіла» від «база недоступна, призупинена чи ключ хибний».
import { describe, expect, it } from "vitest";
import { buildInfo, classifyDbProbe } from "@/lib/health";

describe("classifyDbProbe (/api/health)", () => {
  it("рахує базу живою, коли запит пройшов або Postgres відмовив у правах (42501)", () => {
    expect(classifyDbProbe({ status: 200, error: null })).toEqual({ db: "ok", reason: "" });
    expect(classifyDbProbe({ status: 401, error: { code: "42501", message: "permission denied for table profiles" } })).toEqual({
      db: "ok",
      reason: "",
    });
    expect(classifyDbProbe({ status: 400, error: { code: "PGRST100", message: "bad filter" } }).db).toBe("ok");
  });

  it("повідомляє «paused», коли Supabase відповідає 540 (безкоштовний проєкт призупинено)", () => {
    expect(classifyDbProbe({ status: 540, error: { message: "project paused" } })).toEqual({ db: "down", reason: "paused" });
  });

  it("повідомляє про хибний публічний ключ", () => {
    expect(classifyDbProbe({ status: 401, error: { message: "Invalid API key" } })).toEqual({
      db: "down",
      reason: "invalid-api-key",
    });
  });

  it("не рахує базу живою, коли PostgREST відхилив ключ чи JWT, навіть із кодом PGRST", () => {
    expect(classifyDbProbe({ status: 401, error: { code: "PGRST301", message: "JWSError" } })).toEqual({
      db: "down",
      reason: "status-401-PGRST301",
    });
    expect(classifyDbProbe({ status: 500, error: { code: "PGRST300", message: "JWT secret" } }).db).toBe("down");
    expect(classifyDbProbe({ status: 500, error: { code: "PGRSTX00", message: "connection" } }).db).toBe("down");
    expect(classifyDbProbe({ status: 401, error: { code: "PGRST100", message: "Invalid API key" } })).toEqual({
      db: "down",
      reason: "invalid-api-key",
    });
  });

  it("повідомляє код, коли PostgREST не дістає до бази або мережі немає", () => {
    expect(classifyDbProbe({ status: 503, error: { code: "PGRST002", message: "schema cache" } })).toEqual({
      db: "down",
      reason: "status-503-PGRST002",
    });
    expect(classifyDbProbe({ status: 0, error: { message: "fetch failed" } })).toEqual({ db: "down", reason: "status-0" });
  });
});

// WS11: staging — гілка staging з власною базою. На staging VERCEL_ENV теж "preview", тож розрізняють APP_ENV і ref
// проєкту Supabase з NEXT_PUBLIC_SUPABASE_URL (ref не секрет: браузер і так бачить цю адресу).
describe("buildInfo (/api/health)", () => {
  const STAGING = "abcdefghijklmnopqrst";

  it("показує середовище staging і ref його бази", () => {
    expect(
      buildInfo({
        VERCEL_GIT_COMMIT_SHA: "2c70f47a69b57b584dab3f38ccd7c0879c27106a",
        VERCEL_ENV: "preview",
        APP_ENV: "staging",
        NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING}.supabase.co`,
      }),
    ).toEqual({
      sha: "2c70f47a69b57b584dab3f38ccd7c0879c27106a",
      env: "preview",
      appEnv: "staging",
      supabaseRef: STAGING,
    });
  });

  it("без змінних Vercel — local, appEnv null; ref береться лише з адреси *.supabase.co", () => {
    expect(buildInfo({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" })).toEqual({
      sha: "local",
      env: "local",
      appEnv: null,
      supabaseRef: null,
    });
    expect(buildInfo({ NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING}.supabase.co.evil.test` }).supabaseRef).toBeNull();
    expect(buildInfo({ NEXT_PUBLIC_SUPABASE_URL: `https://a.${STAGING}.supabase.co` }).supabaseRef).toBeNull();
    expect(buildInfo({ NEXT_PUBLIC_SUPABASE_URL: `https://x${STAGING}.supabase.co` }).supabaseRef).toBeNull();
    expect(buildInfo({ NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING.slice(1)}.supabase.co` }).supabaseRef).toBeNull();
    expect(buildInfo({ NEXT_PUBLIC_SUPABASE_URL: "не адреса" }).supabaseRef).toBeNull();
  });

  it("не віддає довільний текст з APP_ENV — лише коротку мітку: до 20 символів, малі літери, цифри й дефіс", () => {
    expect(buildInfo({ APP_ENV: " Staging " }).appEnv).toBe("staging");
    expect(buildInfo({ APP_ENV: "a".repeat(20) }).appEnv).toBe("a".repeat(20));
    expect(buildInfo({ APP_ENV: "a".repeat(21) }).appEnv).toBeNull();
    expect(buildInfo({ APP_ENV: "sb_x" }).appEnv).toBeNull();
    expect(buildInfo({ APP_ENV: "1staging" }).appEnv).toBeNull();
    expect(buildInfo({ APP_ENV: "<script>" }).appEnv).toBeNull();
  });
});
