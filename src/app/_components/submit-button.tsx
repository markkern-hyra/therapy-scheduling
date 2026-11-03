"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

// Кнопка серверної форми: під час надсилання — текст стану й disabled, щоб другий клік не повернув відмову поверх успіху.
export function SubmitButton({
  pendingLabel,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "type" | "disabled"> & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      <Button {...props} type="submit" disabled={pending}>
        {pending ? pendingLabel : children}
      </Button>
      {/* aria-label замінює текст кнопки, тож стан озвучує окрема область; вона є й порожньою, інакше зчитувач її пропустить. */}
      <span role="status" className="sr-only">
        {pending ? pendingLabel : ""}
      </span>
    </>
  );
}
