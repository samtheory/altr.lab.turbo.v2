import { TriggersPanel } from "@/components/triggers-panel";
import { getSession } from "@/lib/auth/session";

export default async function TriggersPage() {
  const session = await getSession();
  const role = session?.role ?? "readonly";
  return <TriggersPanel role={role} />;
}
