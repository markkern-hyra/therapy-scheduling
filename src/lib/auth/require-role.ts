import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accessFor } from "./access";
import { type Role, toRole } from "./roles";

// Хто увійшов і з якою роллю — для requireRole і для /no-access (вона requireRole не викликає). Роль — лише з
// profiles.role, ніколи з user_metadata.
export async function currentUser() {
  const supabase = await createClient();

  // getClaims() перевіряє JWT. getSession() для авторизації на сервері не використовуємо.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  // RLS: власний профіль бачить кожен.
  const { data: profile, error } = claims
    ? await supabase.from("profiles").select("email, role").eq("id", claims.sub).maybeSingle()
    : { data: null, error: null };
  if (error) throw new Error(error.message);

  return {
    supabase,
    signedIn: Boolean(claims),
    role: toRole(profile?.role),
    email: profile?.email ?? claims?.email ?? null,
  };
}

// Початок кожної сторінки й server action (proxy — лише UX). Без входу — на /login; без ролі — на /no-access; роль не з
// переліку — на «/»; без аргументів — будь-яка роль.
export async function requireRole(...roles: Role[]) {
  const { supabase, signedIn, role, email } = await currentUser();

  const access = accessFor(signedIn, role, roles);
  if (access === "login") redirect("/login");
  if (access === "no-access") redirect("/no-access");
  if (access === "forbidden") redirect("/");

  return { supabase, role: role as Role, email };
}
