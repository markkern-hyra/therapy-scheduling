"use client";

import { useActionState } from "react";
import { type CardFormState, createClientCard } from "@/app/clients/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { messageFor } from "@/lib/scheduling/messages";

const INITIAL: CardFormState = { error: null, values: { kind: "adult" } };

// Форма картки з анкети (AC-CARD-01, 02). Після відмови дія повертає введене — поля беруть його як defaultValue, тож
// дані лишаються у формі (AC-CARD-03); key перемальовує форму з новими значеннями.
export function ClientCardForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createClientCard, INITIAL);
  const v = state.values;
  const message = messageFor(state.error);

  return (
    // noValidate: порожні й некоректні поля відхиляє база, і планувальник бачить текст PM, а не підказку браузера.
    <form key={JSON.stringify(v)} action={action} noValidate className="flex max-w-sm flex-col gap-4">
      {message && <Alert>{message}</Alert>}
      <Label>
        Client type
        <Select name="kind" defaultValue={v.kind}>
          <option value="adult">Adult</option>
          <option value="child">Child</option>
        </Select>
      </Label>
      <Label>
        Full name
        <Input name="full_name" autoComplete="off" defaultValue={v.full_name} required />
      </Label>
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
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-medium">For an adult</legend>
        <Label>
          Email
          <Input name="email" type="email" autoComplete="off" defaultValue={v.email} />
        </Label>
      </fieldset>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-medium">For a child — guardian</legend>
        <Label>
          Guardian name
          <Input name="guardian_name" autoComplete="off" defaultValue={v.guardian_name} />
        </Label>
        <Label>
          Guardian email
          <Input name="guardian_email" type="email" autoComplete="off" defaultValue={v.guardian_email} />
        </Label>
      </fieldset>
      <div>
        <Button type="submit" disabled={pending}>
          Create client
        </Button>
      </div>
    </form>
  );
}
