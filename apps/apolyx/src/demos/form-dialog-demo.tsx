"use client";

import * as React from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  FieldInput,
  MaskedInput,
  NumberInput,
  toast,
} from "@altr/apolyx";

import {
  SubmitButton,
  formValues,
  idle,
  useFocusFirstInvalid,
  useFormAction,
  wait,
  type FormState,
} from "./form-shared";

const KEY_TOKENS = { A: /[A-Za-z]/ };

function CreateProjectForm({ onDone }: { onDone: () => void }) {
  const { state, pending, onSubmit } = useFormAction(async (_: FormState, data: FormData): Promise<FormState> => {
    await wait(700);
    const v = formValues(data);
    const errors: FormState["errors"] = {};
    if (!v.name?.trim()) errors.name = "Name the project.";
    if ((v.key ?? "").length !== 3) errors.key = "Use three letters.";
    if (Object.keys(errors).length) return { status: "error", errors };
    toast.success(`Created ${v.name} (${v.key.toUpperCase()}) with ${v.seats} seats`);
    onDone();
    return idle;
  }, idle);
  const formRef = React.useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, state);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Create project</DialogTitle>
        <DialogDescription>The key prefixes every issue, like APX-12.</DialogDescription>
      </DialogHeader>
      <Field label="Project name" error={state.errors.name}>
        <FieldInput name="name" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Key" error={state.errors.key}>
          <MaskedInput name="key" mask="AAA" tokens={KEY_TOKENS} className="font-mono uppercase" />
        </Field>
        <Field label="Seats">
          <NumberInput name="seats" defaultValue={5} min={1} max={50} />
        </Field>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <SubmitButton pending={pending}>Create</SubmitButton>
      </DialogFooter>
    </form>
  );
}

export default function FormDialogDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New project</Button>
      </DialogTrigger>
      <DialogContent>
        <CreateProjectForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
