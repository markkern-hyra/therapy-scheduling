import { AuthShell } from "@/app/_components/auth-shell";
import { ErrorMessage } from "@/app/_components/error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <ErrorMessage code={error} />
      <form action={login} className="flex flex-col gap-4">
        <Label>
          Email
          <Input name="email" type="email" autoComplete="email" required />
        </Label>
        <Label>
          Password
          <Input name="password" type="password" autoComplete="current-password" required />
        </Label>
        <Button type="submit">Sign in</Button>
      </form>
    </AuthShell>
  );
}
