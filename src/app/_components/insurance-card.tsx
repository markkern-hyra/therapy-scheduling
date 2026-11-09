import { Card } from "@/components/ui/card";
import { insuranceLine } from "@/lib/scheduling/insurance";

// Статус перевірки страхування в картці клієнта (design.md impl-insurance-status, «UI і компоненти»). Рядок
// «Insurance: <статус>» бачить кожен, хто бачить картку (AC-INS-01, 03, 04).
export function InsuranceCard({
  insurance,
}: {
  // Рядок client_insurance з картки; null — статусу ще ніхто не позначав (AC-INS-01).
  insurance: { status: string } | null;
}) {
  return (
    <Card title="Insurance">
      <p className="text-base font-medium">{insuranceLine(insurance?.status ?? null)}</p>
    </Card>
  );
}
