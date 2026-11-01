import { LogsPanel } from "@/components/logs-panel";
import { getSession } from "@/lib/auth/session";

export default async function LogsPage() {
  const session = await getSession();
  const role = session?.role ?? "readonly";
  return <LogsPanel role={role} />;
}
