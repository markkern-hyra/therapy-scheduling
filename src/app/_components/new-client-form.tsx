"use client";

import { useActionState } from "react";
import { requestIntakeDraft } from "@/app/clients/new/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INITIAL_INTAKE, MAX_INTAKE_LENGTH } from "@/lib/ai/intake-form";
import { MESSAGES } from "@/lib/scheduling/messages";
import { ClientCardForm } from "./client-card-form";

// Нова картка з чернеткою (зріз 4, design.md impl-client-intake-draft, «UI і компоненти»): поле звернення над формою
// картки. Нова чернетка (seq) перемонтовує форму з полями чернетки; відмова чи збій — повідомлення над формою, а форма
// й введене в неї лишаються як були (AC-INTAKE-06, 08). Зберігає картку лише кнопка «Create client» (AC-INTAKE-03).
export function NewClientForm({ today }: { today: string }) {
  const [draft, action, drafting] = useActionState(requestIntakeDraft, INITIAL_INTAKE);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <form action={action}>
        <Card title="Draft from a client's request">
          <div className="flex flex-col gap-1">
            <Label>
              Client&apos;s request
              <Textarea
                name="intake_text"
                rows={6}
                maxLength={MAX_INTAKE_LENGTH}
                defaultValue={draft.text}
                aria-describedby="intake-hint"
              />
            </Label>
            <p id="intake-hint" className="text-sm text-muted-foreground">
              {MESSAGES.INTAKE_HINT}
            </p>
          </div>
          <div>
            <Button type="submit" variant="secondary" disabled={drafting}>
              {drafting ? "Drafting…" : "Draft card"}
            </Button>
          </div>
        </Card>
      </form>
      {draft.message && <Alert variant={draft.tone}>{draft.message}</Alert>}
      <ClientCardForm key={draft.seq} today={today} initial={draft.values ?? undefined} />
    </div>
  );
}
