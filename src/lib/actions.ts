import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorCode } from "@/lib/scheduling/messages";

// Спільний хвіст кожного server action: виконати запис і повернутися на сторінку `back` —
// з ?error=<КОД> (текст покаже ErrorMessage) або зі свіжими даними.
export async function runAction(
  write: PromiseLike<{ error: { code: string } | null }>,
  back: string,
): Promise<never> {
  const { error } = await write;
  if (error) redirect(`${back}?error=${errorCode(error)}`);
  revalidatePath(back);
  redirect(back);
}
