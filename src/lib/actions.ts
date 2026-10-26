import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorCode } from "@/lib/scheduling/messages";

// Спільний хвіст кожного server action: виконати запис і повернутися на сторінку `back` (з її параметрами) —
// з ?error=<КОД> (текст покаже ErrorMessage) або зі свіжими даними без старої помилки.
export async function runAction(
  write: PromiseLike<{ error: { code: string; message?: string } | null }>,
  back: string,
): Promise<never> {
  const { error } = await write;
  const url = new URL(back, "http://local");
  url.searchParams.delete("error");
  if (error) url.searchParams.set("error", errorCode(error));
  else revalidatePath(url.pathname);
  redirect(url.pathname + url.search);
}
