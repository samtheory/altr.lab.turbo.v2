import { redirect } from "next/navigation";

import { TableBrowser } from "@/components/table-browser";
import { getSession } from "@/lib/auth/session";

type Props = {
  params: Promise<{ name: string }>;
};

export default async function TablePage({ params }: Props) {
  const { name } = await params;
  const table = decodeURIComponent(name);
  if (table === "records") redirect("/records");
  const session = await getSession();
  const role = session?.role ?? "readonly";
  return <TableBrowser table={table} role={role} />;
}
