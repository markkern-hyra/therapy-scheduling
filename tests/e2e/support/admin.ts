// Синтетичні дані UAT і прибирання за ними — секретним ключем Supabase (обходить RLS).
// Лише в тестах і лише на машині розробника (.env.local) або в CI на одноразовому локальному стеку (e2e.yml).
// У GitHub Secrets SUPABASE_SECRET_KEY не додаємо. Без ключа (прогін лише AC, що нічого не пишуть,
// --grep-invert '@writes') цей файл нічого не робить: cleanup.teardown.ts не реєструє тест.
// check:boundary сканує src/, тож цей файл його не порушує; у src/ секретний ключ читає лише src/lib/supabase/admin.ts.
// Ніколи не друкуємо значення ключів і паролів — лише адреси синтетичних користувачів.
//
// Джерело: демо-репо курсу, tests/e2e/support/admin.ts (тег ws8-03-uat). Демо-специфічні помічники (createEmployee
// з підрозділом і посадою, isBlockedDay, leaveRequestsOf) прибрано — подивіться їх у демо як зразок для своїх.
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * ВАШЕ: рядки синтетичного користувача, які треба видалити ДО deleteUser, — таблиці з FK на користувача без
 * on delete cascade (інакше Auth відповідає «Database error deleting user»). У демо: leave_requests.employee_id.
 * Якщо таких таблиць немає (або всі FK — cascade), лишіть порожнім.
 */
const OWNED_ROWS: { table: string; column: string }[] = [];

/** Лише такі адреси прибирання має право видалити: uat-<run>[-<суфікс>]@example.test. */
export const UAT_EMAIL = /^uat-[0-9a-z-]+@example\.test$/;

export function uatEmail(suffix?: string): string {
  const run = process.env.UAT_RUN ?? "manual";
  const email = `uat-${run}${suffix ? `-${suffix}` : ""}@example.test`;
  if (!UAT_EMAIL.test(email)) throw new Error(`Синтетична адреса має вигляд uat-…@example.test, а не ${email}`);
  return email;
}

export const randomPassword = () => `Uat-${randomBytes(12).toString("base64url")}`;

export function hasAdminKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

/** Клієнт із секретним ключем — для ваших помічників синтетичних даних (створити користувача, прочитати рядок). */
export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("Для синтетичних даних UAT потрібні NEXT_PUBLIC_SUPABASE_URL і SUPABASE_SECRET_KEY (.env.local)");
  }
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function listUatUsers(supabase: SupabaseClient): Promise<{ id: string; email: string }[]> {
  const found: { id: string; email: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email && UAT_EMAIL.test(u.email)) found.push({ id: u.id, email: u.email });
    if (data.users.length < 1000) return found;
  }
}

const CLEANUP_LOG = "test-results/uat-cleanup.jsonl";

/** Усі uat-адреси, які видалив цей прогін (за журналом). */
export function deletedThisRun(): string[] {
  if (!existsSync(CLEANUP_LOG)) return [];
  const entries = readFileSync(CLEANUP_LOG, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { deleted: string[] });
  return [...new Set(entries.flatMap((e) => e.deleted))];
}

/** leftoverRequests — скільки рядків видалених користувачів лишилось у таблицях OWNED_ROWS (назва поля — з демо). */
export type CleanupResult = { deleted: string[]; remaining: string[]; leftoverRequests: number };

/**
 * Видаляє ВСІХ uat-*@example.test (і тих, що лишились після обірваних прогонів), а потім перевіряє:
 * жодного такого користувача й жодного їхнього рядка в OWNED_ROWS.
 */
export async function deleteUatUsers(onlyEmail?: string): Promise<CleanupResult> {
  const supabase = adminClient();
  const targets = (await listUatUsers(supabase)).filter((u) => !onlyEmail || u.email === onlyEmail);
  const deleted: string[] = [];
  for (const u of targets) {
    for (const { table, column } of OWNED_ROWS) {
      const { error: rowsError } = await supabase.from(table).delete().eq(column, u.id);
      if (rowsError) throw rowsError;
    }
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) throw error;
    deleted.push(u.email);
  }
  const remaining = (await listUatUsers(supabase))
    .filter((u) => !onlyEmail || u.email === onlyEmail)
    .map((u) => u.email);
  let leftoverRequests = 0;
  for (const { table, column } of targets.length ? OWNED_ROWS : []) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .in(
        column,
        targets.map((u) => u.id),
      );
    if (error) throw error;
    leftoverRequests += count ?? 0;
  }
  // Журнал прибирань прогону: afterAll специфікацій і teardown (Playwright чистить test-results/ на старті прогону).
  mkdirSync("test-results", { recursive: true });
  appendFileSync(
    CLEANUP_LOG,
    `${JSON.stringify({ at: new Date().toISOString(), scope: onlyEmail ?? "uat-*", deleted, remaining, leftoverRequests })}\n`,
  );
  return { deleted, remaining, leftoverRequests };
}

// ── Синтетичні картки клієнтів зрізу 3 (impl-insurance-status, UAT AC-INS-01…06) ─────────────────────────────────────
// Картка uat-<run>-<суфікс>@example.test — лише для одного тесту; прибирання — deleteUatClients (утримання й статус
// страхування картки видаляються каскадом: holds.client_id і client_insurance.client_id — on delete cascade).

/** Нова картка дорослого з анкети; статусу страхування немає («Not set»). Повертає id картки. */
export async function createUatClient(suffix: string, fullName: string): Promise<string> {
  const { data, error } = await adminClient()
    .from("clients")
    .insert({ kind: "adult", full_name: fullName, email: uatEmail(suffix), birth_date: "1990-05-14", language: "English" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** «Дано»: статус перевірки страхування картки в обхід RLS (null — «Not set», рядка немає). */
export async function setUatInsurance(clientId: string, status: string | null): Promise<void> {
  const table = adminClient().from("client_insurance");
  const { error } = status
    ? await table.upsert({ client_id: clientId, status }, { onConflict: "client_id" })
    : await table.delete().eq("client_id", clientId);
  if (error) throw error;
}

/** Що зберігає база — для невидимих частин «Тоді» («статус не змінився»). */
export async function uatInsuranceOf(clientId: string): Promise<string | null> {
  const { data, error } = await adminClient()
    .from("client_insurance")
    .select("status")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  return (data?.status as string | undefined) ?? null;
}

/**
 * «client6 — свій клієнт therapist1»: scheduler1 утримує за карткою найближчий вільний слот терапевта, що почнеться не
 * раніше ніж за добу. Від імені scheduler1, а не секретним ключем: тригер утримання вимагає роль планувальника.
 */
export async function holdUatClientWith(clientId: string, therapistEmail: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const password = process.env.UAT_PASSWORD_SCHEDULER ?? process.env.DEMO_USER_PASSWORD;
  if (!url || !key || !password) throw new Error("Для утримання потрібні NEXT_PUBLIC_SUPABASE_* і пароль scheduler1");
  const scheduler = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await scheduler.auth.signInWithPassword({ email: "scheduler1@example.test", password });
  if (signInError) throw signInError;
  const { data: therapist, error: therapistError } = await adminClient()
    .from("profiles")
    .select("id")
    .eq("email", therapistEmail)
    .single();
  if (therapistError) throw therapistError;
  const { data: slots, error: slotsError } = await scheduler
    .from("slots")
    .select("id")
    .eq("therapist_id", therapist.id)
    .gt("starts_at", new Date(Date.now() + 24 * 3_600_000).toISOString())
    .order("starts_at")
    .limit(40);
  if (slotsError) throw slotsError;
  for (const slot of slots ?? []) {
    const { error } = await scheduler.from("holds").insert({ slot_id: slot.id, client_id: clientId });
    if (!error) return;
    if (!/SLOT_TAKEN/.test(error.message)) throw error;
  }
  throw new Error(`немає вільного слота ${therapistEmail} для утримання синтетичної картки`);
}

/** Видаляє всі картки uat-*@example.test (і залишки обірваних прогонів); повертає, скільки лишилось. */
export async function deleteUatClients(): Promise<{ deleted: number; remaining: number }> {
  const supabase = adminClient();
  const uatCards = async () => {
    const { data, error } = await supabase.from("clients").select("id, email").like("email", "uat-%@example.test");
    if (error) throw error;
    return (data ?? []).filter((c) => UAT_EMAIL.test(String(c.email)));
  };
  const targets = await uatCards();
  if (targets.length) {
    const { error } = await supabase
      .from("clients")
      .delete()
      .in(
        "id",
        targets.map((c) => c.id),
      );
    if (error) throw error;
  }
  return { deleted: targets.length, remaining: (await uatCards()).length };
}
