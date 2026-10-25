"use client";

import { useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Field,
  FieldInput,
} from "@altr/apolyx";

export function TableApiPlayground() {
  const [table, setTable] = useState("records");
  const [query, setQuery] = useState("limit=20");
  const [body, setBody] = useState("");
  const [out, setOut] = useState("Send a request to see the JSON.");

  async function send(method: string) {
    const path = `/api/v1/${encodeURIComponent(table)}${query ? `?${query}` : ""}`;
    const res = await fetch(path, {
      method,
      headers: body && method !== "GET" ? { "content-type": "application/json" } : undefined,
      body: method === "GET" || method === "DELETE" ? undefined : body || undefined,
    });
    const text = await res.text();
    setOut(`${res.status}\n${text}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <AlertTitle>PostgREST-lite</AlertTitle>
        <AlertDescription>
          Filters are op.value (eq, neq, gt, gte, lt, lte, like, ilike, in, is).
          ilike is lower(column) LIKE lower(value). Default limit 100, max 1000.
          PATCH and DELETE need a filter. all=true is service only.
          Prefer count=planned may be null on libSQL. count=exact runs a full count.
        </AlertDescription>
      </Alert>
      <Field label="Table">
        <FieldInput value={table} onChange={(e) => setTable(e.target.value)} />
      </Field>
      <Field label="Query">
        <FieldInput value={query} onChange={(e) => setQuery(e.target.value)} />
      </Field>
      <Field label="JSON body">
        <FieldInput value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="button" onClick={() => void send("GET")}>GET</Button>
        <Button type="button" onClick={() => void send("POST")}>POST</Button>
        <Button type="button" onClick={() => void send("PATCH")}>PATCH</Button>
        <Button type="button" onClick={() => void send("DELETE")}>DELETE</Button>
      </div>
      <pre className="overflow-auto rounded-md border p-3 text-sm">{out}</pre>
    </div>
  );
}
