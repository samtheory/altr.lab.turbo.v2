import { redirect } from "next/navigation";

import { TableBrowser } from "@/components/table-browser";

type Props = {
  params: Promise<{ name: string }>;
};

export default async function TablePage({ params }: Props) {
  const { name } = await params;
  const table = decodeURIComponent(name);
  if (table === "records") redirect("/records");
  return <TableBrowser table={table} />;
}
