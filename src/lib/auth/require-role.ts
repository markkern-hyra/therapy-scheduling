import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "./roles";

// Початок кожної сторінки й server action. Без входу — на /login; роль не з переліку — на «/»;
// без аргументів — будь-який користувач, що увійшов. Роль — лише з profiles.role, ніколи з user_metadata.
export async function requireRole(...roles: Role[]) {
  const supabase = await createClient();

  // getClaims() перевіряє JWT. getSession() для авторизації на сервері не використовуємо.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  // RLS: власний профіль бачить кожен.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, role")
    .eq("id", claims.sub)
    .maybeSingle();
  const role = (profile?.role ?? null) as Role | null;
  if (roles.length > 0 && !(role && roles.includes(role))) redirect("/");

  return { supabase, role, email: profile?.email ?? claims.email ?? null };
}
