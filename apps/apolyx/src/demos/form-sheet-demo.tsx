"use client";

import * as React from "react";
import {
  Avatar,
  AvatarFallback,
  Button,
  Field,
  FieldInput,
  FieldSet,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SwitchField,
  toast,
} from "@altr/apolyx";

import {
  EMAIL,
  SubmitButton,
  formValues,
  idle,
  useFocusFirstInvalid,
  useFormAction,
  wait,
  type FormState,
} from "./form-shared";

type Member = { name: string; email: string; admin: boolean };

function EditMemberForm({ member, onSave }: { member: Member; onSave: (m: Member) => void }) {
  const { state, pending, onSubmit } = useFormAction(async (_: FormState, data: FormData): Promise<FormState> => {
    await wait(600);
    const v = formValues(data);
    const errors: FormState["errors"] = {};
    if (!v.name?.trim()) errors.name = "Enter a name.";
    if (!EMAIL.test(v.email ?? "")) errors.email = "Enter a valid email.";
    if (Object.keys(errors).length) return { status: "error", errors };
    toast.success("Member updated");
    onSave({ name: v.name, email: v.email, admin: v.admin === "on" });
    return idle;
  }, idle);
  const formRef = React.useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(formRef, state);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex h-full flex-col gap-6">
      <SheetHeader>
        <SheetTitle>Edit member</SheetTitle>
        <SheetDescription>Changes apply the next time they sign in.</SheetDescription>
      </SheetHeader>
      <div className="grid gap-5">
        <Field label="Name" error={state.errors.name}>
          <FieldInput name="name" autoComplete="off" defaultValue={member.name} />
        </Field>
        <Field label="Email" error={state.errors.email}>
          <FieldInput name="email" type="email" autoComplete="off" defaultValue={member.email} />
        </Field>
        <FieldSet legend="Access" variant="framed">
          <SwitchField
            name="admin"
            label="Admin"
            description="Can manage billing and members."
            defaultChecked={member.admin}
          />
        </FieldSet>
      </div>
      <SheetFooter className="mt-auto">
        <SheetClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </SheetClose>
        <SubmitButton pending={pending}>Save</SubmitButton>
      </SheetFooter>
    </form>
  );
}

export default function FormSheetDemo() {
  const [open, setOpen] = React.useState(false);
  const [member, setMember] = React.useState<Member>({
    name: "Grace Hopper",
    email: "grace@apolyx.dev",
    admin: false,
  });
  const initials = member.name
    .split(" ")
    .map((p) => p[0])
    .join("");

  return (
    <div className="flex w-full max-w-sm items-center gap-3 rounded-lg border border-border p-3">
      <Avatar>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {member.email} · {member.admin ? "Admin" : "Member"}
        </p>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </SheetTrigger>
        <SheetContent side="right">
          <EditMemberForm
            member={member}
            onSave={(m) => {
              setMember(m);
              setOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
