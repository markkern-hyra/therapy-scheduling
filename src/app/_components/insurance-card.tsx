import { setInsuranceStatus } from "@/app/clients/actions";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Choice } from "@/components/ui/choice";
import { INSURANCE_STATUSES, insuranceLine } from "@/lib/scheduling/insurance";
import { MESSAGES } from "@/lib/scheduling/messages";
import { SubmitButton } from "./submit-button";

// Статус перевірки страхування в картці клієнта (design.md impl-insurance-status, «UI і компоненти»). Рядок
// «Insurance: <статус>» бачить кожен, хто бачить картку (AC-INS-01, 03, 04); позначка — лише для admin і scheduler:
// терапевту дію не показуємо (AC-INS-04), а прямий запит відхиляють дія й база (AC-INS-05).
export function InsuranceCard({
  clientId,
  insurance,
  canMark,
  saved,
}: {
  clientId: string;
  // Рядок client_insurance з картки; null — статусу ще ніхто не позначав (AC-INS-01).
  insurance: { status: string } | null;
  canMark: boolean;
  saved: boolean;
}) {
  const status = insurance?.status ?? null;
  return (
    <Card title="Insurance">
      {saved && <Alert variant="success">{MESSAGES.INSURANCE_SAVED}</Alert>}
      <p className="text-base font-medium">{insuranceLine(status)}</p>
      {canMark && (
        <form action={setInsuranceStatus} className="flex flex-col gap-4">
          <input type="hidden" name="client_id" value={clientId} />
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Insurance status</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {INSURANCE_STATUSES.map((s) => (
                <Choice key={s.value} name="status" value={s.value} defaultChecked={status === s.value} required>
                  {s.label}
                </Choice>
              ))}
            </div>
          </fieldset>
          <div>
            <SubmitButton pendingLabel="Saving…">Save insurance status</SubmitButton>
          </div>
        </form>
      )}
    </Card>
  );
}
