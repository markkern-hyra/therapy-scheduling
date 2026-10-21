"use server";

import { runAction } from "@/lib/actions";
import { requireRole } from "@/lib/auth/require-role";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { clientFromForm } from "@/lib/scheduling/clients";

// Інша роль — на «/», як і сторінка (тексту PM для цієї відмови немає). Правила картки й RLS перевіряє база.
export async function createClientCard(formData: FormData) {
  const { supabase } = await requireRole(...STAFF_ROLES);
  await runAction(supabase.from("clients").insert(clientFromForm(formData)), "/clients");
}
