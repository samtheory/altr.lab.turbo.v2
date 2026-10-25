import { SqlConsolePanel } from "@/components/sql-console-panel";
import { getSession } from "@/lib/auth/session";

export default async function SqlPage() {
  const session = await getSession();
  return <SqlConsolePanel role={session?.role ?? "readonly"} />;
}
