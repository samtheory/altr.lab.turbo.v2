import { AuthUrlsSection } from "@/components/auth-console-sections";
import { getSession } from "@/lib/auth/session";

export default async function AuthUrlConfigurationPage() {
  const session = await getSession();
  return <AuthUrlsSection role={session?.role ?? "readonly"} />;
}
