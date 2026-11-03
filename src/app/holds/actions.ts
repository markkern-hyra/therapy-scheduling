"use server";

import { runAction } from "@/lib/actions";
import { requireRole } from "@/lib/auth/require-role";
import { isStaff } from "@/lib/auth/roles";

// Підтвердження — один update; дозвіл і правила (прострочене, слот почався, вже підтверджене) перевіряє тригер бази
// check_hold_confirm. Час ставить база. Тут лише вхід і куди повернутися: терапевт сторінки утримань не бачить
// (AC-HOLD-44), тож текст відмови дії — на головній (AC-HOLD-14).
export async function confirmHold(form: FormData) {
  const { supabase, role } = await requireRole();
  await runAction(
    supabase.from("holds").update({ confirmed_at: new Date().toISOString() }).eq("id", String(form.get("hold_id"))),
    isStaff(role) ? "/holds" : "/",
  );
}
