import { PoliciesPanel } from "@/components/policies-panel";
import { getSession } from "@/lib/auth/session";

export default async function PoliciesPage() {
  const session = await getSession();
  const role = session?.role ?? "readonly";
  return <PoliciesPanel role={role} />;
}
