export type IdStrategyKind =
  | "none"
  | "uuid_v4"
  | "uuid_v7"
  | "ulid"
  | "nanoid"
  | "cuid2"
  | "identity"
  | "serial";

export type FkActionForm =
  | "cascade"
  | "set null"
  | "restrict"
  | "no action"
  | "set default";

export type ColumnSettingsForm = {
  nullable: boolean;
  unique: boolean;
  autoUpdateTimestamp: boolean;
  defaultKind: "none" | "literal" | "now" | "gen_random_uuid";
  defaultLiteral: string;
  idStrategy: IdStrategyKind;
  check: string;
  comment: string;
  minLength: string;
  maxLength: string;
  pattern: string;
  enumValues: string;
  min: string;
  max: string;
  /** S0055 — foreign key section */
  fkEnabled: boolean;
  fkSchema: string;
  fkTable: string;
  fkColumn: string;
  fkOnDelete: FkActionForm;
  fkOnUpdate: FkActionForm;
};

export type SchemaColumn = {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
  dflt_value: string | null;
  settings?: Record<string, unknown>;
};

export type SchemaForeignKey = {
  columns: string[];
  references: { schema: string; table: string; columns: string[] };
  onDelete?: string;
  onUpdate?: string;
  cardinality?: string;
};

export type SchemaTable = {
  name: string;
  schema?: string;
  columns: SchemaColumn[];
  foreignKeys?: SchemaForeignKey[];
};

export const COLUMN_TYPES = ["TEXT", "INTEGER", "REAL", "BLOB"] as const;
export type ColumnType = (typeof COLUMN_TYPES)[number];

export const EMPTY_COLUMN_SETTINGS: ColumnSettingsForm = {
  nullable: true,
  unique: false,
  autoUpdateTimestamp: false,
  defaultKind: "none",
  defaultLiteral: "",
  idStrategy: "none",
  check: "",
  comment: "",
  minLength: "",
  maxLength: "",
  pattern: "",
  enumValues: "",
  min: "",
  max: "",
  fkEnabled: false,
  fkSchema: "",
  fkTable: "",
  fkColumn: "",
  fkOnDelete: "no action",
  fkOnUpdate: "no action",
};

export const FK_ACTIONS: FkActionForm[] = [
  "cascade",
  "set null",
  "restrict",
  "no action",
  "set default",
];

export function settingsFormToPayload(
  form: ColumnSettingsForm,
): Record<string, unknown> {
  const settings: Record<string, unknown> = {
    nullable: form.nullable,
    unique: form.unique,
    autoUpdateTimestamp: form.autoUpdateTimestamp,
  };
  if (form.defaultKind === "literal") {
    settings.default = { kind: "literal", value: form.defaultLiteral };
  } else if (form.defaultKind !== "none") {
    settings.default = { kind: form.defaultKind };
  } else {
    settings.default = { kind: "none" };
  }
  if (form.check.trim()) settings.check = form.check.trim();
  if (form.comment.trim()) settings.comment = form.comment.trim();
  if (form.idStrategy !== "none") {
    settings.idStrategy = { kind: form.idStrategy };
  }

  const validation: Record<string, unknown> = {};
  if (form.minLength !== "") validation.minLength = Number(form.minLength);
  if (form.maxLength !== "") validation.maxLength = Number(form.maxLength);
  if (form.pattern.trim()) validation.pattern = form.pattern.trim();
  if (form.enumValues.trim()) {
    validation.enum = form.enumValues
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (form.min !== "") validation.min = Number(form.min);
  if (form.max !== "") validation.max = Number(form.max);
  if (Object.keys(validation).length > 0) settings.validation = validation;

  if (
    form.fkEnabled &&
    form.fkSchema.trim() &&
    form.fkTable.trim() &&
    form.fkColumn.trim()
  ) {
    settings.foreignKey = {
      schema: form.fkSchema.trim(),
      table: form.fkTable.trim(),
      column: form.fkColumn.trim(),
      onDelete: form.fkOnDelete,
      onUpdate: form.fkOnUpdate,
    };
  }
  return settings;
}

export function previewAddColumnSql(
  table: string,
  column: string,
  type: ColumnType,
  settings?: ColumnSettingsForm,
): string {
  const parts = [`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`];
  if (settings) {
    if (settings.defaultKind === "now") parts.push("DEFAULT CURRENT_TIMESTAMP");
    if (settings.defaultKind === "literal" && settings.defaultLiteral) {
      parts.push(`DEFAULT '${settings.defaultLiteral.replace(/'/g, "''")}'`);
    }
    if (!settings.nullable) parts.push("NOT NULL");
    if (settings.unique) parts.push("UNIQUE");
    if (settings.check.trim()) parts.push(`CHECK (${settings.check.trim()})`);
    if (
      settings.fkEnabled &&
      settings.fkSchema &&
      settings.fkTable &&
      settings.fkColumn
    ) {
      parts.push(
        `REFERENCES "${settings.fkSchema}"."${settings.fkTable}"("${settings.fkColumn}") ON DELETE ${settings.fkOnDelete.toUpperCase()} ON UPDATE ${settings.fkOnUpdate.toUpperCase()}`,
      );
    }
  }
  return `${parts.join(" ")};`;
}

/** Same reserved set as jord CREATE / DDL alter. */
export function isAlterableUserTable(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower !== "records" &&
    !lower.startsWith("jord_") &&
    !lower.startsWith("sqlite_") &&
    !lower.startsWith("pg_")
  );
}
