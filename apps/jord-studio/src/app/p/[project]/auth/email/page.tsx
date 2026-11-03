import { AuthEmailSection } from "@/components/auth-console-sections";
import { getSession } from "@/lib/auth/session";

export default async function AuthEmailPage() {
  const session = await getSession();
  return <AuthEmailSection role={session?.role ?? "readonly"} />;
}
