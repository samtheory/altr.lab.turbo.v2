import { JobsPanel } from "@/components/jobs-panel";
import { getSession } from "@/lib/auth/session";

export default async function JobsPage() {
  const session = await getSession();
  const role = session?.role ?? "readonly";
  return <JobsPanel role={role} />;
}
