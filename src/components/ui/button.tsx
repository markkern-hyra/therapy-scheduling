import Link from "next/link";
import type { ComponentProps } from "react";

const VARIANTS = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary: "border border-input bg-card text-foreground hover:bg-muted",
  // Тиха дія без рамки: «Sign out», кроки днями.
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
};
// md — висота поля вводу (h-10), тож кнопка стає в один ряд із полями; sm — дії в рядках списку й у шапці.
const SIZES = { md: "h-10 px-4", sm: "h-8 px-3" };

type Look = { variant?: keyof typeof VARIANTS; size?: keyof typeof SIZES };
const look = ({ variant = "primary", size = "md" }: Look) =>
  `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]}`;

// Одна головна дія на екран — primary; решта — secondary чи ghost. Іконка (з icons.tsx) — перед підписом, не замість.
export function Button({ variant, size, ...props }: Omit<ComponentProps<"button">, "className"> & Look) {
  return <button {...props} className={look({ variant, size })} />;
}

// Перехід, що виглядає як кнопка: «New client», «Cancel», кроки днями.
export function ButtonLink({ variant, size, ...props }: Omit<ComponentProps<typeof Link>, "className"> & Look) {
  return <Link {...props} className={look({ variant, size })} />;
}
