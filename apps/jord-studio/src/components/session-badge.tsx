"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Badge, Button } from "@altr/apolyx";

import type { JordRole } from "@/lib/auth/roles";

type Props = {
  role: JordRole;
  bypass: boolean;
};

export function SessionBadge({ role, bypass }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onLogout() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <div className="ml-auto flex items-center gap-2">
      <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wide">
        {role}
        {bypass ? " · bypass" : ""}
      </Badge>
      {!bypass ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={onLogout}
        >
          Sign out
        </Button>
      ) : null}
    </div>
  );
}
