import { AuthJwtSection } from "@/components/auth-console-sections";
import { getSession } from "@/lib/auth/session";

export default async function AuthJwtPage() {
  const session = await getSession();
  return <AuthJwtSection role={session?.role ?? "readonly"} />;
}
