import { FunctionsPanel } from "@/components/functions-panel";
import { getSession } from "@/lib/auth/session";

export default async function FunctionsApiPage() {
  const session = await getSession();
  const role = session?.role ?? "readonly";
  return <FunctionsPanel role={role} />;
}
