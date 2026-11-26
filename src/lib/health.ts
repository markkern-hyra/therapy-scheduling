// D0: чи відповіла база на запит /api/health. Чиста функція — щоб перевірити всі гілки тестом без мережі.
// Запит — публічним ключем до таблиці без доступу для anon: «немає прав» (42501) теж означає, що Postgres живий.

/** Код SQLSTATE Postgres, напр. 42501 «permission denied»: запит дійшов до бази. */
const SQLSTATE = /^[0-9A-Z]{5}$/;
/** PostgREST не може під'єднатися до бази (000–003, X00) або відхилив JWT (300, 301): запит не дійшов до бази. */
const PGRST_DB_DOWN = /^PGRST(00[0-3]|30[01]|X00)$/;
/** Supabase відповідає 540, коли безкоштовний проєкт призупинено (Dashboard → Resume project). */
const SUPABASE_PAUSED = 540;

export type DbProbe = { status: number; error: { code?: string; message?: string } | null };
export type DbHealth = { db: "ok" | "down"; reason: string };

/** WS11: APP_ENV — змінна Vercel лише для гілки staging. Лише коротка мітка: довільний текст у відповідь не йде. */
const APP_ENV = /^[a-z][a-z0-9-]{0,19}$/;
/** Ref проєкту Supabase — перша частина адреси https://<ref>.supabase.co; не секрет (браузер бачить цю адресу). */
const SUPABASE_HOST = /^([a-z0-9]{20})\.supabase\.co$/;

function supabaseRef(url: string | undefined): string | null {
  try {
    return SUPABASE_HOST.exec(new URL(url ?? "").hostname)?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Яка збірка відповідає і в яку базу ходить. На staging VERCEL_ENV теж "preview" — розрізняють APP_ENV і supabaseRef.
 * VERCEL_GIT_COMMIT_SHA є, коли у Vercel увімкнено «Automatically expose System Environment Variables» (типово так).
 */
export function buildInfo(env: Readonly<Record<string, string | undefined>>) {
  const appEnv = env.APP_ENV?.trim() ?? "";
  return {
    sha: env.VERCEL_GIT_COMMIT_SHA ?? "local",
    env: env.VERCEL_ENV ?? "local",
    appEnv: APP_ENV.test(appEnv) ? appEnv : null,
    supabaseRef: supabaseRef(env.NEXT_PUBLIC_SUPABASE_URL),
  };
}

export function classifyDbProbe({ status, error }: DbProbe): DbHealth {
  if (status === SUPABASE_PAUSED) return { db: "down", reason: "paused" };
  const code = error?.code ?? "";
  if (/api key/i.test(error?.message ?? "")) return { db: "down", reason: "invalid-api-key" };
  if (!error || SQLSTATE.test(code) || (code.startsWith("PGRST") && !PGRST_DB_DOWN.test(code))) {
    return { db: "ok", reason: "" };
  }
  // 0 — мережа (Supabase недоступний або хибний URL), 5xx, PGRST000–003.
  return { db: "down", reason: `status-${status}${code ? `-${code}` : ""}` };
}
