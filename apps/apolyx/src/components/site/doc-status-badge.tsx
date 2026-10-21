import { Badge, cn } from "@altr/apolyx";

import type { DocStatus } from "@/docs-config";

/** Docs-only status chip. `new` uses a purple surface so it reads as a release marker. */
export function DocStatusBadge({
  status,
  className,
}: {
  status?: DocStatus;
  className?: string;
}) {
  if (status !== "new") return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide",
        "bg-[oklch(0.55_0.2_310)] text-[oklch(0.99_0.01_310)]",
        "dark:bg-[oklch(0.72_0.14_310)] dark:text-[oklch(0.2_0.04_310)]",
        className,
      )}
    >
      new
    </Badge>
  );
}
