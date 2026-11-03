import { AuthProvidersSection } from "@/components/auth-console-sections";
import { getSession } from "@/lib/auth/session";

export default async function AuthProvidersPage() {
  const session = await getSession();
  return <AuthProvidersSection role={session?.role ?? "readonly"} />;
}
