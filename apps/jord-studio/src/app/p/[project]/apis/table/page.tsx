import { TableApiPlayground } from "@/components/table-api-playground";

export default function TableApiPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Table API</h1>
      <p className="text-sm">
        Authenticated <code>/api/v1/:table</code>. OpenAPI is{" "}
        <code>GET /api/v1/openapi.json</code>. No embeds or joins.
      </p>
      <TableApiPlayground />
    </main>
  );
}
