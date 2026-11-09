// Статус перевірки страхування (зріз 3; design.md impl-insurance-status, рішення 4). Значення — як у check
// client_insurance_status_check; підписи — дослівно з AC PM. «Not set» — лише відсутність рядка: позначити його не можна.
export const INSURANCE_STATUSES = [
  { value: "verified", label: "Verified" },
  { value: "not_accepted", label: "Not accepted" },
  { value: "private_pay", label: "Private pay" },
] as const;

// Рядок у картці клієнта — текстом, не лише кольором (Припущення PM): «Insurance: Not set» (AC-INS-01), «Insurance:
// Verified» (AC-INS-02) …
// Значення поза списком — схема й застосунок розійшлися: помилка, а не «Not set» замість справжнього статусу.
export function insuranceLine(status: string | null): string {
  if (status === null) return "Insurance: Not set";
  const label = INSURANCE_STATUSES.find((s) => s.value === status)?.label;
  if (!label) throw new Error(`Unknown insurance status: ${status}`);
  return `Insurance: ${label}`;
}
