import { Alert, AlertDescription, AlertTitle } from "@altr/apolyx";

type Props = {
  title: string;
  description: string;
  dependency: string;
  planned: string[];
};

/** Gated Auth console section — names the owning card instead of faking a form (S0070). */
export function AuthSectionGate({
  title,
  description,
  dependency,
  planned,
}: Props) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Auth
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Alert variant="warning">
        <AlertTitle>Not wired yet</AlertTitle>
        <AlertDescription>
          This section is gated until <strong>{dependency}</strong> ships. No
          toggle here writes anything today.
        </AlertDescription>
      </Alert>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Planned in that card</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {planned.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
