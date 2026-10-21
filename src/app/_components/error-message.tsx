import { Alert } from "@/components/ui/alert";
import { messageFor } from "@/lib/scheduling/messages";

// Текст для ?error=<КОД> після server action (runAction) чи входу; невідомий код — нічого.
export function ErrorMessage({ code }: { code: unknown }) {
  const message = messageFor(code);
  return message ? <Alert>{message}</Alert> : null;
}
