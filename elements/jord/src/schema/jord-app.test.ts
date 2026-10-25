import { describe, expect, it } from "vitest";

import {
  assertRuntimeRole,
  JORD_APP_ROLE,
  jordAppGrantStatements,
  planJordApp,
  type RoleProbe,
} from "./jord-app.js";

function probe(partial: Partial<RoleProbe> & Pick<RoleProbe, "name">): RoleProbe {
  return {
    name: partial.name,
    createRole: partial.createRole ?? false,
    bypassRls: partial.bypassRls ?? false,
    owns: partial.owns ?? [],
  };
}

describe("planJordApp", () => {
  it("creates jord_app when the role is missing and migrate has CREATEROLE", () => {
    const plan = planJordApp({
      migrate: probe({ name: "owner", createRole: true }),
      app: null,
      tables: ["notes"],
    });
    expect("error" in plan).toBe(false);
    if ("error" in plan) return;
    expect(plan.createdRole).toBe(true);
    expect(plan.statements[0]).toBe(`CREATE ROLE ${JORD_APP_ROLE} LOGIN`);
    expect(plan.statements).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "notes" TO jord_app',
    );
    expect(plan.statements.some((sql) => sql.includes("FORCE ROW LEVEL SECURITY"))).toBe(
      true,
    );
  });

  it("errors when jord_app is missing and migrate lacks CREATEROLE", () => {
    const plan = planJordApp({
      migrate: probe({ name: "owner", createRole: false }),
      app: null,
      tables: ["notes"],
    });
    expect("error" in plan).toBe(true);
    if (!("error" in plan)) return;
    expect(plan.error).toContain("CREATEROLE");
    expect(plan.error).toContain("jord_app");
  });

  it("errors when jord_app has BYPASSRLS", () => {
    const plan = planJordApp({
      migrate: probe({ name: "owner", createRole: true }),
      app: probe({ name: "jord_app", bypassRls: true }),
      tables: ["notes"],
    });
    expect("error" in plan).toBe(true);
    if (!("error" in plan)) return;
    expect(plan.error).toContain("BYPASSRLS");
  });

  it("errors when jord_app owns a table", () => {
    const plan = planJordApp({
      migrate: probe({ name: "owner", createRole: true }),
      app: probe({ name: "jord_app", owns: ["notes", "other"] }),
      tables: ["notes"],
    });
    expect("error" in plan).toBe(true);
    if (!("error" in plan)) return;
    expect(plan.error).toContain("notes");
    expect(plan.error).toContain("jord_app must not own application tables");
  });

  it("grants only when jord_app already exists without BYPASSRLS or ownership", () => {
    const plan = planJordApp({
      migrate: probe({ name: "owner", createRole: false }),
      app: probe({ name: "jord_app" }),
      tables: ["notes"],
    });
    expect("error" in plan).toBe(false);
    if ("error" in plan) return;
    expect(plan.createdRole).toBe(false);
    expect(plan.statements.some((sql) => sql.startsWith("CREATE ROLE"))).toBe(false);
    expect(plan.statements[0]).toContain("GRANT SELECT");
  });
});

describe("jordAppGrantStatements", () => {
  it("enables and forces row level security and skips unsafe names", () => {
    const sql = jordAppGrantStatements(["notes", "bad-name", "records"]);
    expect(sql).toEqual([
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "notes" TO jord_app',
      'ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "notes" FORCE ROW LEVEL SECURITY',
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "records" TO jord_app',
      'ALTER TABLE "records" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "records" FORCE ROW LEVEL SECURITY',
    ]);
    expect(sql.join("\n")).toContain("FORCE ROW LEVEL SECURITY");
    expect(JORD_APP_ROLE).toBe("jord_app");
  });
});

describe("assertRuntimeRole", () => {
  it("names BYPASSRLS and table ownership", async () => {
    await expect(
      assertRuntimeRole({
        query: async (sql) => {
          if (sql.includes("rolbypassrls")) {
            return { rows: [{ rolbypassrls: true }] };
          }
          return { rows: [] };
        },
      }),
    ).rejects.toThrow(/BYPASSRLS/);

    await expect(
      assertRuntimeRole({
        query: async (sql) => {
          if (sql.includes("rolbypassrls")) {
            return { rows: [{ rolbypassrls: false }] };
          }
          return { rows: [{ name: "records" }] };
        },
      }),
    ).rejects.toThrow(/owns application table records/);

    await expect(
      assertRuntimeRole({
        query: async (sql) => {
          if (sql.includes("rolbypassrls")) {
            return { rows: [{ rolbypassrls: false }] };
          }
          return { rows: [] };
        },
      }),
    ).resolves.toBeUndefined();
  });
});
