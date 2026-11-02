"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@altr/apolyx";
import { Plus } from "lucide-react";

import { useInspectorOptional } from "@/components/inspector-host";
import { useRegisterStudioSidebar } from "@/components/studio-panes";
import {
  StudioSidebarList,
  SidebarBadge,
  type SidebarItem,
} from "@/components/studio-sidebar-list";
import { useProjectHref, useProjectSlug } from "@/hooks/use-project-path";
import {
  SCHEMA_ALL,
  fallbackDefaultSchema,
  loadSchemaPref,
  resolveSchemaSelection,
  saveSchemaPref,
} from "@/lib/studio-schema-prefs";
import { useWorkspaceTabsOptional } from "@/components/workspace-tabs";

type ApiError = { message?: string };

type SchemaInfo = { name: string; readOnly: boolean };

type TableRow = {
  id: string;
  name: string;
  schema: string;
};

const FILTER_OPTIONS = [
  { value: "all", label: "All tables" },
  { value: "has-rows", label: "Has rows" },
  { value: "empty", label: "Empty" },
  { value: "tracked", label: "Tracked" },
  { value: "policies", label: "Has policies" },
] as const;

type FilterValue = (typeof FILTER_OPTIONS)[number]["value"];

export function StudioTablesSidebar() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const hrefFor = useProjectHref();
  const projectSlug = useProjectSlug();
  const inspector = useInspectorOptional();
  const workspaceTabs = useWorkspaceTabsOptional();

  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schemaReady, setSchemaReady] = useState(false);

  const [searchValue, setSearchValue] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [filterValue, setFilterValue] = useState<FilterValue>(() => {
    const raw = searchParams.get("filter");
    if (raw && FILTER_OPTIONS.some((o) => o.value === raw)) {
      return raw as FilterValue;
    }
    return "all";
  });
  const [selectedSchema, setSelectedSchema] = useState<string>("public");

  const defaultSchema = useMemo(
    () => fallbackDefaultSchema(schemas.map((s) => s.name)),
    [schemas],
  );

  const schemaReadOnly = useMemo(() => {
    if (selectedSchema === SCHEMA_ALL) return false;
    return schemas.find((s) => s.name === selectedSchema)?.readOnly ?? false;
  }, [schemas, selectedSchema]);

  const singleReadonlyMain =
    schemas.length === 1 &&
    schemas[0]?.name === "main" &&
    schemas[0]?.readOnly === true;

  // Sync search from URL without fighting typing.
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q !== searchValue) setSearchValue(q);
  }, [searchParams, searchValue]);

  useEffect(() => {
    const raw = searchParams.get("filter");
    if (raw && FILTER_OPTIONS.some((o) => o.value === raw)) {
      setFilterValue(raw as FilterValue);
    }
  }, [searchParams]);

  const selectedId = useMemo(() => {
    // Tab keys and list item ids are both `schema.table`.
    if (workspaceTabs?.active) return workspaceTabs.active;
    return activeTableId(pathname, searchParams, selectedSchema, defaultSchema);
  }, [
    workspaceTabs?.active,
    pathname,
    searchParams,
    selectedSchema,
    defaultSchema,
  ]);

  const rewriteParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const applySchemaToUrl = useCallback(
    (schema: string, def: string) => {
      rewriteParams((next) => {
        if (schema === SCHEMA_ALL) {
          next.set("schema", SCHEMA_ALL);
        } else if (schema === def) {
          next.delete("schema");
        } else {
          next.set("schema", schema);
        }
      });
    },
    [rewriteParams],
  );

  const loadSchemas = useCallback(async (): Promise<SchemaInfo[]> => {
    const res = await fetch("/api/schema/schemas", { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiError;
      throw new Error(
        body.message ?? `Failed to list schemas (${res.status}).`,
      );
    }
    const data = (await res.json()) as { schemas: SchemaInfo[] };
    return data.schemas ?? [];
  }, []);

  const loadTablesForSchema = useCallback(
    async (schema: string): Promise<string[]> => {
      const qs = `?schema=${encodeURIComponent(schema)}`;
      const res = await fetch(`/api/schema/tables${qs}`, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiError;
        throw new Error(
          body.message ?? `Failed to list tables (${res.status}).`,
        );
      }
      const data = (await res.json()) as { tables: string[] };
      return data.tables ?? [];
    },
    [],
  );

  const schemaParam = searchParams.get("schema");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listed = await loadSchemas();
      setSchemas(listed);
      const names = listed.map((s) => s.name);
      const def = fallbackDefaultSchema(names);
      const stored = loadSchemaPref(projectSlug);
      const resolved = resolveSchemaSelection({
        urlSchema: schemaParam,
        stored,
        defaultSchema: def,
        available: names,
      });
      setSelectedSchema(resolved);
      setSchemaReady(true);
      saveSchemaPref(projectSlug, resolved);

      const countEntries: Record<string, number> = {};
      let rows: TableRow[] = [];

      if (resolved === SCHEMA_ALL) {
        const perSchema = await Promise.all(
          listed.map(async (s) => {
            const namesInSchema = await loadTablesForSchema(s.name);
            countEntries[s.name] = namesInSchema.length;
            return namesInSchema.map((name) => ({
              id: `${s.name}.${name}`,
              name,
              schema: s.name,
            }));
          }),
        );
        rows = perSchema.flat();
      } else {
        const namesInSchema = await loadTablesForSchema(resolved);
        countEntries[resolved] = namesInSchema.length;
        // Picker badges: fetch remaining schema counts in parallel.
        await Promise.all(
          listed
            .filter((s) => s.name !== resolved)
            .map(async (s) => {
              try {
                const n = await loadTablesForSchema(s.name);
                countEntries[s.name] = n.length;
              } catch {
                countEntries[s.name] = 0;
              }
            }),
        );
        rows = namesInSchema.map((name) => ({
          id: name,
          name,
          schema: resolved,
        }));
      }

      setCounts(countEntries);
      setTables(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tables");
      setTables([]);
      setSchemas([]);
    } finally {
      setLoading(false);
    }
  }, [loadSchemas, loadTablesForSchema, projectSlug, schemaParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSchemaChange = useCallback(
    (value: string) => {
      setSelectedSchema(value);
      saveSchemaPref(projectSlug, value);
      applySchemaToUrl(value, defaultSchema);
      // load effect re-runs via URL change
    },
    [projectSlug, applySchemaToUrl, defaultSchema],
  );

  const onSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      rewriteParams((next) => {
        if (value) next.set("q", value);
        else next.delete("q");
      });
    },
    [rewriteParams],
  );

  const onFilterChange = useCallback(
    (value: string) => {
      const nextFilter = (FILTER_OPTIONS.some((o) => o.value === value)
        ? value
        : "all") as FilterValue;
      setFilterValue(nextFilter);
      rewriteParams((next) => {
        if (nextFilter === "all") next.delete("filter");
        else next.set("filter", nextFilter);
      });
    },
    [rewriteParams],
  );

  const openCreateTable = useCallback(() => {
    if (selectedSchema === SCHEMA_ALL) return;
    inspector?.open("create-table", { schema: selectedSchema });
  }, [inspector, selectedSchema]);

  // Hotkey: `n` opens add table when not typing in an input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "n" && e.key !== "N") return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (selectedSchema === SCHEMA_ALL || schemaReadOnly) return;
      e.preventDefault();
      openCreateTable();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openCreateTable, selectedSchema, schemaReadOnly]);

  const onSelect = useCallback(
    (item: SidebarItem, _index: number) => {
      const row = tables.find((t) => t.id === item.id);
      if (!row) return;
      const isRecords = row.name === "records";
      if (isRecords) {
        const next = new URLSearchParams();
        const q = searchParams.get("q");
        const filter = searchParams.get("filter");
        if (q) next.set("q", q);
        if (filter) next.set("filter", filter);
        const qs = next.toString();
        const base = hrefFor("/records");
        router.push(qs ? `${base}?${qs}` : base);
        return;
      }
      // S0051 — open/focus a workspace tab keyed schema.table.
      if (workspaceTabs?.enabled) {
        workspaceTabs.openTab({ schema: row.schema, table: row.name });
        return;
      }
      const base = hrefFor(`/tables/${encodeURIComponent(row.name)}`);
      const next = new URLSearchParams();
      const q = searchParams.get("q");
      const filter = searchParams.get("filter");
      if (q) next.set("q", q);
      if (filter) next.set("filter", filter);
      if (row.schema !== defaultSchema) {
        next.set("schema", row.schema);
      } else if (selectedSchema === SCHEMA_ALL) {
        next.set("schema", SCHEMA_ALL);
      }
      const qs = next.toString();
      router.push(qs ? `${base}?${qs}` : base);
    },
    [
      tables,
      hrefFor,
      router,
      searchParams,
      defaultSchema,
      selectedSchema,
      workspaceTabs,
    ],
  );

  const filteredTables = useMemo(() => {
    let rows = tables;
    if (searchValue) {
      const lower = searchValue.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.name.toLowerCase().includes(lower) ||
          `${t.schema}.${t.name}`.toLowerCase().includes(lower),
      );
    }
    // Filters that need row/track/policy stats are reserved until a list
    // endpoint returns them; keep the menu wired so URL state survives.
    return rows;
  }, [tables, searchValue]);

  const showSchemaQualifier =
    selectedSchema !== defaultSchema || selectedSchema === SCHEMA_ALL;

  const leading = (
    <>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="jord-schema-picker"
          className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          Schema
        </label>
        <div className="flex items-center gap-2">
          <Select
            value={selectedSchema}
            onValueChange={onSchemaChange}
            disabled={loading || !schemaReady || singleReadonlyMain}
          >
            <SelectTrigger
              id="jord-schema-picker"
              className="w-full"
              aria-label="Schema"
            >
              <SelectValue placeholder="Schema" />
            </SelectTrigger>
            <SelectContent>
              {schemas.length > 1 ? (
                <SelectItem value={SCHEMA_ALL}>
                  All schemas
                </SelectItem>
              ) : null}
              {schemas.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="font-mono text-xs">
                      {s.name}
                      {s.readOnly ? " (read-only)" : ""}
                    </span>
                    <Badge
                      variant="outline"
                      className="ml-2 text-[10px] tabular-nums"
                    >
                      {counts[s.name] ?? "·"}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showSchemaQualifier && selectedSchema !== SCHEMA_ALL ? (
            <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
              {selectedSchema}
            </Badge>
          ) : null}
        </div>
        {singleReadonlyMain ? (
          <p className="text-[11px] text-muted-foreground">
            libSQL exposes a single <code className="font-mono">main</code>{" "}
            schema.
          </p>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-start"
        disabled={
          loading ||
          selectedSchema === SCHEMA_ALL ||
          schemaReadOnly ||
          !inspector
        }
        onClick={openCreateTable}
        aria-keyshortcuts="n"
      >
        <Plus className="mr-1.5 size-3.5" aria-hidden />
        Add new table
      </Button>
    </>
  );

  useRegisterStudioSidebar(
    <StudioSidebarList
      header="Tables"
      leading={leading}
      searchable
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      filterOptions={[...FILTER_OPTIONS]}
      filterValue={filterValue}
      onFilterChange={onFilterChange}
      items={buildTableItems(
        filteredTables,
        hrefFor,
        defaultSchema,
        selectedSchema === SCHEMA_ALL,
      )}
      selectedId={selectedId || undefined}
      onSelect={onSelect}
      error={error ?? undefined}
      loading={loading}
      listAriaLabel="Tables list"
      empty={
        selectedSchema === SCHEMA_ALL
          ? "No tables in any schema"
          : (
              <span className="flex flex-col items-center gap-2">
                <span>No tables in this schema</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={schemaReadOnly || !inspector}
                  onClick={openCreateTable}
                >
                  <Plus className="mr-1 size-3.5" aria-hidden />
                  Add new table
                </Button>
              </span>
            )
      }
      footer={
        <p className="px-3 pb-2 text-xs text-muted-foreground">
          Press <kbd className="font-mono">/</kbd> to search,{" "}
          <kbd className="font-mono">n</kbd> to add a table.
        </p>
      }
    />,
  );

  return null;
}

function activeTableId(
  pathname: string,
  searchParams: URLSearchParams,
  selectedSchema: string,
  defaultSchema: string,
): string {
  const nameMatch = pathname.match(/^\/p\/[^/]+\/tables\/([^/]+)$/);
  if (nameMatch) {
    try {
      const name = decodeURIComponent(nameMatch[1] ?? "");
      const schemaParam = searchParams.get("schema");
      const activeParam = searchParams.get("active");
      if (activeParam && activeParam.includes(".")) return activeParam;
      if (schemaParam && schemaParam !== SCHEMA_ALL) {
        return `${schemaParam}.${name}`;
      }
      if (selectedSchema === SCHEMA_ALL) {
        return `${defaultSchema}.${name}`;
      }
      return `${selectedSchema || defaultSchema}.${name}`;
    } catch {
      return "";
    }
  }
  if (pathname.match(/^\/p\/[^/]+\/records/)) {
    return "records";
  }
  const param = searchParams.get("table");
  return param && param !== "" ? param : "";
}

function buildTableItems(
  tables: TableRow[],
  hrefFor: (path?: string) => string,
  defaultSchema: string,
  allMode: boolean,
): SidebarItem[] {
  return tables.map((row) => {
    const isRecords = row.name === "records";
    const label =
      allMode || row.schema !== defaultSchema
        ? `${row.schema}.${row.name}`
        : row.name;
    const href = isRecords
      ? hrefFor("/records")
      : hrefFor(`/tables/${encodeURIComponent(row.name)}`);
    return {
      id: row.id,
      label,
      href,
      badge: (
        <>
          {row.schema !== defaultSchema && !allMode ? (
            <SidebarBadge variant="secondary">{row.schema}</SidebarBadge>
          ) : null}
          {isRecords ? (
            <SidebarBadge variant="secondary">scratchpad</SidebarBadge>
          ) : null}
        </>
      ),
      hint: isRecords ? "column-scratchpad editor" : "CRUD table",
    };
  });
}
