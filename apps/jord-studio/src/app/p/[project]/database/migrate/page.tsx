import { MigrateWizardPanel } from "@/components/migrate-wizard-panel";
import { getSession } from "@/lib/auth/session";

export default async function MigratePage() {
  const session = await getSession();
  return <MigrateWizardPanel role={session?.role ?? "readonly"} />;
}
