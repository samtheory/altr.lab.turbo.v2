import { GeneratedApiPanel } from "@/components/generated-api-panel";
import { getSession } from "@/lib/auth/session";

export default async function GeneratedApiPage() {
  const session = await getSession();
  const role = session?.role ?? "readonly";
  return <GeneratedApiPanel role={role} />;
}
