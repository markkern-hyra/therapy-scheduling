"use server";

import { runAction } from "@/lib/actions";
import { requireRole } from "@/lib/auth/require-role";
import { isStaff } from "@/lib/auth/roles";
import { slotsHref } from "@/lib/scheduling/links";
import { isPracticeDay } from "@/lib/scheduling/time";

// Утримання — один insert; дозвіл (лише admin і scheduler) і правила (слот зайнятий, почався, клієнт зайнятий)
// перевіряє тригер бази check_new_hold, тож прямий запит до Data API отримує ті самі відмови (рішення 4, ADR 0002).
// Тут лише вхід (getClaims у requireRole) і куди повернутися: терапевт сторінки слотів не відкриває, тож бачить текст
// відмови на головній (AC-HOLD-08).
export async function holdSlot(form: FormData) {
  const { supabase, role } = await requireRole();
  const therapist = String(form.get("therapist") ?? "");
  const day = form.get("day");
  // Адреса повернення — лише з перевірених параметрів, не з форми як є (без відкритого перенаправлення).
  const back = isStaff(role) ? slotsHref(therapist, isPracticeDay(day) ? day : undefined) : "/";
  await runAction(
    supabase.from("holds").insert({ slot_id: String(form.get("slot_id")), client_id: String(form.get("client_id")) }),
    back,
  );
}
