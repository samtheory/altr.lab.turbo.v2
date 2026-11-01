import { VectorsPanel } from "@/components/vectors-panel";
import { getSession } from "@/lib/auth/session";

export default async function VectorsPage() {
  const session = await getSession();
  const role = session?.role ?? "readonly";
  return <VectorsPanel role={role} />;
}
