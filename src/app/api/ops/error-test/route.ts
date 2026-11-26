// WS11, B: тимчасовий маршрут — навмисна помилка сервера, щоб перевірити трекер (onRequestError у src/instrumentation.ts)
// на staging. Лише адміністратор (роль — з profiles через requireRole); решту requireRole перенаправляє. Приберемо
// окремим PR після перевірки на staging.
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await requireRole("admin");
  throw new Error("WS11: навмисна помилка для перевірки трекера помилок");
}
