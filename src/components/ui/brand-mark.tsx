// Знак продукту: монограма «TS» на акценті — у шапці й над карткою входу.
export function BrandMark() {
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-sm bg-primary text-xs font-bold tracking-wide text-primary-foreground"
    >
      TS
    </span>
  );
}
