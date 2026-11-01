import { MigratePageClient } from "@/components/migrate-page-client";
import { getSession } from "@/lib/auth/session";

export default async function MigratePage() {
  const session = await getSession();
  return <MigratePageClient role={session?.role ?? "readonly"} />;
}
