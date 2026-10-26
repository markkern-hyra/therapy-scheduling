import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { currentUser } from "@/lib/auth/require-role";
import { MESSAGES } from "@/lib/scheduling/messages";

// Користувач без ролі бачить лише повідомлення, без навігації й даних (AC-CARD-11). requireRole тут не викликаємо — він
// сам веде сюди (цикл перенаправлень); перевіряємо лише вхід. «Sign out» — рекомендація питання
// Sofiia-pm/therapy-scheduling-spec#29, даних не показує.
export default async function NoAccessPage() {
  const { signedIn, role } = await currentUser();
  if (!signedIn) redirect("/login");
  if (role) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-6">
      <p className="text-base">{MESSAGES.NO_ROLE}</p>
      <form action={signOut}>
        <Button variant="secondary">Sign out</Button>
      </form>
    </main>
  );
}
