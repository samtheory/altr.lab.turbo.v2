import { describe, expect, it } from "vitest";

import {
  applyAutoUpdateTimestamps,
  columnConstraintSql,
  isNotNullWithoutDefault,
  parseColumnSettings,
  requiresConfirm,
  validateColumnValue,
} from "./column-settings.js";

describe("parseColumnSettings", () => {
  it("accepts empty and full settings", () => {
    expect(parseColumnSettings(null).ok).toBe(true);
    const full = parseColumnSettings({
      nullable: false,
      unique: true,
      default: { kind: "now" },
      autoUpdateTimestamp: true,
      check: "len(title) > 0",
      collation: "NOCASE",
      comment: "hello",
      validation: {
        minLength: 1,
        maxLength: 40,
        pattern: "^[a-z]+$",
        enum: ["a", "b"],
        min: 0,
        max: 10,
        minDate: "2020-01-01",
        maxDate: "2030-01-01",
      },
    });
    expect(full.ok).toBe(true);
  });

  it("rejects bad regex and inverted ranges", () => {
    const badRe = parseColumnSettings({ validation: { pattern: "(" } });
    expect(badRe.ok).toBe(false);
    const badRange = parseColumnSettings({ validation: { min: 5, max: 1 } });
    expect(badRange.ok).toBe(false);
  });
});

describe("validateColumnValue", () => {
  const settings = parseColumnSettings({
    validation: {
      min: 1,
      max: 10,
      minLength: 2,
      maxLength: 5,
      pattern: "^[a-z]+$",
      enum: ["ab", "cd"],
    },
  });
  if (!settings.ok) throw new Error("parse failed");

  it("accepts valid values and rejects each rule type", () => {
    expect(validateColumnValue("n", 5, settings.settings).ok).toBe(true);
    expect(validateColumnValue("n", 0, settings.settings).ok).toBe(false);
    expect(validateColumnValue("n", 11, settings.settings).ok).toBe(false);

    expect(validateColumnValue("t", "ab", settings.settings).ok).toBe(true);
    expect(validateColumnValue("t", "a", settings.settings).ok).toBe(false);
    expect(validateColumnValue("t", "abcdef", settings.settings).ok).toBe(false);
    expect(validateColumnValue("t", "AB", settings.settings).ok).toBe(false);
    expect(validateColumnValue("t", "xy", settings.settings).ok).toBe(false);

    const miss = validateColumnValue("t", "xy", settings.settings);
    expect(miss.ok).toBe(false);
    if (!miss.ok) {
      expect(miss.error).toBe("validation");
      expect(miss.field).toBe("t");
    }
  });

  it("skips rules when value is null", () => {
    expect(validateColumnValue("t", null, settings.settings).ok).toBe(true);
  });
});

describe("DDL helpers", () => {
  it("renders constraints and flags unsafe NOT NULL", () => {
    const sql = columnConstraintSql(
      {
        nullable: false,
        unique: true,
        default: { kind: "literal", value: "x" },
        check: "title <> ''",
      },
      "libsql",
    );
    expect(sql).toContain("NOT NULL");
    expect(sql).toContain("UNIQUE");
    expect(sql).toContain("DEFAULT 'x'");
    expect(sql).toContain("CHECK (title <> '')");

    expect(isNotNullWithoutDefault({ nullable: false })).toBe(true);
    expect(
      isNotNullWithoutDefault({
        nullable: false,
        default: { kind: "literal", value: 1 },
      }),
    ).toBe(false);
    expect(requiresConfirm("drop_column")).toMatch(/confirm/);
  });

  it("stamps auto-update timestamps on write values", () => {
    const stamped = applyAutoUpdateTimestamps(
      [
        { name: "title" },
        { name: "updated_at", settings: { autoUpdateTimestamp: true } },
      ],
      { title: "hi" },
      42,
    );
    expect(stamped).toEqual({ title: "hi", updated_at: 42 });
  });
});
