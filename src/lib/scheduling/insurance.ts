// Статус перевірки страхування (зріз 3; design.md impl-insurance-status, рішення 4). Значення — як у check
// client_insurance_status_check; підписи — дослівно з AC PM. «Not set» — лише відсутність рядка: позначити його не можна.
export const INSURANCE_STATUSES = [
  { value: "verified", label: "Verified" },
  { value: "not_accepted", label: "Not accepted" },
  { value: "private_pay", label: "Private pay" },
] as const;

// Рядок у картці клієнта — текстом, не лише кольором (Припущення PM): «Insurance: Not set» (AC-INS-01), «Insurance:
// Verified» (AC-INS-02) …
export function insuranceLine(status: string | null): string {
  const label = INSURANCE_STATUSES.find((s) => s.value === status)?.label ?? "Not set";
  return `Insurance: ${label}`;
}
