import { AuthSettingsSection } from "@/components/auth-console-sections";
import { getSession } from "@/lib/auth/session";

export default async function AuthSettingsPage() {
  const session = await getSession();
  return <AuthSettingsSection role={session?.role ?? "readonly"} />;
}
