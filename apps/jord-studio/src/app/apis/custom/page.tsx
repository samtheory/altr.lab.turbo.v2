import { CustomApisPanel } from "@/components/custom-apis-panel";
import { getSession } from "@/lib/auth/session";

export default async function CustomApisPage() {
  const session = await getSession();
  const role = session?.role ?? "readonly";
  return <CustomApisPanel role={role} />;
}
