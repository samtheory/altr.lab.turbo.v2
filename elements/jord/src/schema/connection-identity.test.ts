import { describe, expect, it } from "vitest";

import {
  postgresConnectionIdentity,
  samePostgresConnection,
} from "./connection-identity.js";

describe("postgres connection identity", () => {
  it("matches the same host, port, database, and user when password and query differ", () => {
    const left =
      "postgres://alice:s3cret@DB.Example.com:5432/jord?sslmode=require";
    const right =
      "postgresql://alice:other@db.example.com:5432/jord?application_name=jord#session";

    expect(samePostgresConnection(left, right)).toBe(true);
    expect(postgresConnectionIdentity(left)).toEqual({
      host: "db.example.com",
      port: "5432",
      database: "jord",
      user: "alice",
    });
  });

  it("rejects a different user", () => {
    expect(
      samePostgresConnection(
        "postgres://alice@db.example.com:5432/jord",
        "postgres://bob@db.example.com:5432/jord",
      ),
    ).toBe(false);
  });

  it("treats a trailing slash and the default port as the explicit :5432 form", () => {
    expect(
      samePostgresConnection(
        "postgres://alice@db.example.com/jord/",
        "postgresql://alice@db.example.com:5432/jord",
      ),
    ).toBe(true);
  });

  it("returns null for a file URL and does not treat it as the same connection", () => {
    expect(postgresConnectionIdentity("file:./jord.db")).toBeNull();
    expect(samePostgresConnection("file:./jord.db", "file:./jord.db")).toBe(
      false,
    );
  });
});
