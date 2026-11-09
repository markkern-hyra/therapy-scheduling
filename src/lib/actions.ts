import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorCode, type MessageCode } from "@/lib/scheduling/messages";

// Спільний хвіст кожного server action: виконати запис і повернутися на сторінку `back` (з її параметрами) —
// з ?error=<КОД> (текст покаже ErrorMessage) або зі свіжими даними без старої помилки, а якщо задано `notice` — ще й
// з ?notice=<КОД> (повідомлення про успіх, напр. «Insurance status saved.», AC-INS-02).
export async function runAction(
  write: PromiseLike<{ error: { code: string; message?: string } | null }>,
  back: string,
  notice?: MessageCode,
): Promise<never> {
  const { error } = await write;
  const url = new URL(back, "http://local");
  // «//host» — уже інший сайт: повертаємо лише на свої сторінки.
  if (url.pathname.startsWith("//")) url.pathname = "/";
  url.searchParams.delete("error");
  url.searchParams.delete("notice");
  if (error) url.searchParams.set("error", errorCode(error));
  else {
    if (notice) url.searchParams.set("notice", notice);
    revalidatePath(url.pathname);
  }
  redirect(url.pathname + url.search);
}
