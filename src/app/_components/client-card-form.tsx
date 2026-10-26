"use client";

import { useActionState } from "react";
import { type CardFormState, createClientCard } from "@/app/clients/actions";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Choice } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { messageFor } from "@/lib/scheduling/messages";

const INITIAL: CardFormState = { error: null, values: { kind: "adult" } };
// Поля контакту за типом без JS: обрано «Child» — видно опікуна, інакше — email дорослого. Сховане поле однаково
// надсилається, але cardFromForm бере лише поля обраного типу.
const ADULT_ONLY = "flex flex-col gap-4 [form:has(#kind-child:checked)_&]:hidden";
const CHILD_ONLY = "hidden flex-col gap-4 [form:has(#kind-child:checked)_&]:flex";

// Форма картки з анкети (AC-CARD-01, 02). Після відмови дія повертає введене — поля беруть його як defaultValue, тож
// дані лишаються у формі (AC-CARD-03); key перемальовує форму з новими значеннями.
export function ClientCardForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createClientCard, INITIAL);
  const v = state.values;
  const message = messageFor(state.error);

  return (
    // noValidate: порожні й некоректні поля відхиляє база, і планувальник бачить текст PM, а не підказку браузера.
    <form key={JSON.stringify(v)} action={action} noValidate className="flex max-w-xl flex-col gap-6">
      {message && <Alert>{message}</Alert>}
      <Card title="Client">
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium">Client type</legend>
          <div className="grid grid-cols-2 gap-2">
            <Choice id="kind-adult" name="kind" value="adult" defaultChecked={v.kind !== "child"}>
              Adult
            </Choice>
            <Choice id="kind-child" name="kind" value="child" defaultChecked={v.kind === "child"}>
              Child
            </Choice>
          </div>
        </fieldset>
        <Label>
          Full name
          <Input name="full_name" autoComplete="off" defaultValue={v.full_name} required />
        </Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Date of birth
            <Input name="birth_date" type="date" max={today} defaultValue={v.birth_date} required />
          </Label>
          <Label>
            Session language
            <Select name="language" defaultValue={v.language ?? ""} required>
              <option value="" disabled>
                Choose a language
              </option>
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
            </Select>
          </Label>
        </div>
      </Card>
      <Card title="Contact">
        <div className={ADULT_ONLY}>
          <Label>
            Email
            <Input name="email" type="email" autoComplete="off" defaultValue={v.email} required />
          </Label>
        </div>
        <div className={CHILD_ONLY}>
          <p className="text-sm text-muted-foreground">A child has no email of their own: enter the guardian.</p>
          <Label>
            Guardian name
            <Input name="guardian_name" autoComplete="off" defaultValue={v.guardian_name} required />
          </Label>
          <Label>
            Guardian email
            <Input name="guardian_email" type="email" autoComplete="off" defaultValue={v.guardian_email} required />
          </Label>
        </div>
      </Card>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          Create client
        </Button>
        <ButtonLink href="/clients" variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
