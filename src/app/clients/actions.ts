"use server";

import { runAction } from "@/lib/actions";
import { requireRole } from "@/lib/auth/require-role";
import { clientFromForm } from "@/lib/scheduling/clients";

// Лише вхід: дозвіл (admin / scheduler) і правила картки перевіряє база — RLS, check і unique.
export async function createClientCard(formData: FormData) {
  const { supabase } = await requireRole();
  await runAction(supabase.from("clients").insert(clientFromForm(formData)), "/clients");
}
