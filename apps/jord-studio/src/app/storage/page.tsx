import { StoragePanel } from "@/components/storage-panel";
import { getSession } from "@/lib/auth/session";

export default async function StoragePage() {
  const session = await getSession();
  const role = session?.role ?? "readonly";
  return <StoragePanel role={role} />;
}
