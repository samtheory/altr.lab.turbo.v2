import { CreateRecordForm } from "@/components/create-record-form";
import { getSession } from "@/lib/auth/session";

export default async function NewRecordPage() {
  const session = await getSession();
  const role = session?.role ?? "readonly";
  return <CreateRecordForm role={role} />;
}
