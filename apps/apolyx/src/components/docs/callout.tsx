import { Alert, AlertDescription, AlertTitle } from "@altr/apolyx";

export function Callout({
  title,
  variant = "info",
  children,
}: {
  title?: string;
  variant?: "info" | "warning" | "success" | "default";
  children: React.ReactNode;
}) {
  return (
    <Alert variant={variant} className="not-prose my-6">
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
