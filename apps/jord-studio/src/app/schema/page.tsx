import { SchemaExplorer } from "@/components/schema-explorer";
import { getSession } from "@/lib/auth/session";

export default async function SchemaPage() {
  const session = await getSession();
  const role = session?.role ?? "readonly";
  return <SchemaExplorer role={role} />;
}
