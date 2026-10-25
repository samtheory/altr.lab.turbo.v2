import { UsersAdminPanel } from "@/components/users-admin-panel";
import { getSession } from "@/lib/auth/session";

export default async function UsersPage() {
  const session = await getSession();
  return <UsersAdminPanel role={session?.role ?? "readonly"} />;
}
