import { AuthRateLimitsSection } from "@/components/auth-console-sections";
import { getSession } from "@/lib/auth/session";

export default async function AuthRateLimitsPage() {
  const session = await getSession();
  return <AuthRateLimitsSection role={session?.role ?? "readonly"} />;
}
