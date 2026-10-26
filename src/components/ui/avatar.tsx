// Ініціали: перші літери двох перших слів імені; з email — з частини до @; одне слово — дві перші літери.
export function initials(name: string): string {
  const words = name.split("@")[0].split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toUpperCase();
}

const SIZES = { sm: "size-8 text-xs", lg: "size-12 text-base" };

// Коло з ініціалами людини (користувач у шапці, клієнт у списку й картці); ім'я завжди поруч текстом.
export function Avatar({ name, size = "sm" }: { name: string; size?: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary ${SIZES[size]}`}
    >
      {initials(name)}
    </span>
  );
}
