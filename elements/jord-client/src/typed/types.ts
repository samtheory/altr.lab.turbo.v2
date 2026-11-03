/**
 * Type-level half of the typed table builder (S0088). Types only, no runtime.
 *
 * The `Database` map comes from `jord gen types` (S0087): `'schema.table': { Row; Insert; Update }`.
 * An optional `Relationships` entry per table (not emitted by the generator yet) names embeds:
 *   `Relationships: { author: { table: 'public.users' }; posts: { table: 'public.posts'; many: true } }`
 * Without it, an embed name must equal another table in the same schema and is assumed
 * many-to-one (`object | null`).
 */

/** Error from a request. `status` is 0 for network failures. */
export interface JordError {
  status: number;
  code: string;
  message: string;
}

/** Response metadata present on every result. */
export interface JordResultMeta {
  status: number;
  /** `Prefer: count=...` value, when requested and returned. */
  count: number | null;
  /** Keyset mode only. */
  nextCursor: string | null;
  hasMore: boolean | null;
}

/** `{ data, error }`; exactly one is non-null. HTTP and network errors never throw. */
export type JordResult<T> = JordResultMeta &
  ({ data: T; error: null } | { data: null; error: JordError });

/** Marker type produced when a select string cannot be typed. */
export interface SelectError<M extends string = string> {
  readonly __jordSelectError: M;
}

// ---------- Database map helpers ----------

export type TableKeys<DB> = Extract<keyof DB, string>;
export type RowOf<DB, K extends keyof DB> = DB[K] extends { Row: infer R } ? R : never;
export type InsertOf<DB, K extends keyof DB> = DB[K] extends { Insert: infer R } ? R : never;
export type UpdateOf<DB, K extends keyof DB> = DB[K] extends { Update: infer R } ? R : never;
type RelationsOf<DB, K extends keyof DB> = DB[K] extends { Relationships: infer R } ? R : {};

/** `'users'` for each `'public.users'` key: the shorthand accepted by `from()`. */
export type PublicNames<DB> = Extract<keyof DB, `public.${string}`> extends `public.${infer N}`
  ? N
  : never;

type SchemaOf<K extends string> = K extends `${infer S}.${string}` ? S : "public";

type ResolveRel<DB, K extends keyof DB & string, N extends string> = N extends keyof RelationsOf<
  DB,
  K
>
  ? RelationsOf<DB, K>[N] extends { table: infer T extends keyof DB & string }
    ? { table: T; many: RelationsOf<DB, K>[N] extends { many: true } ? true : false }
    : never
  : `${SchemaOf<K>}.${N}` extends infer T extends keyof DB & string
    ? { table: T; many: false }
    : never;

// ---------- select-string parser (one level of embeds) ----------

type Simplify<T> = { [P in keyof T]: T[P] } & {};
type IsErr<T> = T extends SelectError<string> ? true : false;
type Names<C extends string> = C extends `${infer H},${infer T}` ? H | Names<T> : C;

type ProjectCols<Row, C extends string> = "*" extends Names<C>
  ? Row
  : [Exclude<Names<C>, keyof Row>] extends [never]
    ? Pick<Row, Names<C> & keyof Row>
    : SelectError<`unknown column '${Exclude<Names<C>, keyof Row> & string}'`>;

type Embed<
  DB,
  K extends keyof DB & string,
  Alias extends string,
  Rel extends string,
  C extends string,
> = C extends `${string}(${string}`
  ? SelectError<"nested embeds are not supported (one level only)">
  : [ResolveRel<DB, K, Rel>] extends [never]
    ? SelectError<`unknown relation '${Rel}'`>
    : ResolveRel<DB, K, Rel> extends { table: infer T extends keyof DB & string; many: infer M }
      ? ProjectCols<RowOf<DB, T>, C> extends infer P
        ? true extends IsErr<P>
          ? P
          : { [A in Alias]: M extends true ? P[] : P | null }
        : never
      : never;

type ItemResult<DB, K extends keyof DB & string, I extends string> = I extends "*"
  ? RowOf<DB, K>
  : I extends `${infer Alias}:${infer Rest}`
    ? Rest extends `${infer Rel}(${infer C})`
      ? Embed<DB, K, Alias, Rel, C>
      : SelectError<`alias on a plain column is not supported: '${I}'`>
    : I extends `${infer Rel}(${infer C})`
      ? Embed<DB, K, Rel, Rel, C>
      : I extends keyof RowOf<DB, K>
        ? Pick<RowOf<DB, K>, I>
        : SelectError<`unknown column '${I}'`>;

type NextItem<S extends string> = S extends `${infer A},${string}`
  ? A extends `${string}(${string}`
    ? S extends `${infer Pre}(${infer Inner})${infer After}`
      ? After extends ""
        ? [`${Pre}(${Inner})`, ""]
        : After extends `,${infer R}`
          ? [`${Pre}(${Inner})`, R]
          : SelectError<"unexpected text after embed">
      : SelectError<"unbalanced parentheses">
    : S extends `${A},${infer B}`
      ? [A, B]
      : never
  : S extends `${string}(${string}`
    ? S extends `${string}(${string})`
      ? [S, ""]
      : SelectError<"unbalanced parentheses">
    : [S, ""];

type Items<
  DB,
  K extends keyof DB & string,
  S extends string,
  Acc = unknown,
  D extends 1[] = [],
> = D["length"] extends 24
  ? SelectError<"too many select items (max 24)">
  : NextItem<S> extends infer N
    ? N extends SelectError<string>
      ? N
      : N extends [infer I extends string, infer Rest extends string]
        ? ItemResult<DB, K, I> extends infer R
          ? true extends IsErr<R>
            ? R
            : Rest extends ""
              ? Simplify<Acc & R>
              : Items<DB, K, Rest, Acc & R, [...D, 1]>
          : never
        : never
    : never;

/**
 * Result row type for a select string. Supported: `'*'`, `'a,b'`, `'*,author(*)'`,
 * `'id,author:users(name)'`. Anything else (unknown column/relation, nested embed, a
 * non-literal `string`) is a {@link SelectError}, never `any`. Items are capped at 24 and the
 * parser recurses once per item, so type checking stays fast.
 */
export type ParseSelect<DB, K extends keyof DB & string, S extends string> = string extends S
  ? SelectError<"select must be a string literal to be typed">
  : S extends "" | "*"
    ? RowOf<DB, K>
    : Items<DB, K, S>;

/** Parameter type for `select()`: the string itself when valid, otherwise a readable message. */
export type SelectArg<DB, K extends keyof DB & string, S extends string> = string extends S
  ? S
  : ParseSelect<DB, K, S> extends SelectError<infer M>
    ? `select error: ${M}`
    : S;

// ---------- filters ----------

type Cols<Row> = Extract<keyof Row, string>;
type ColsOf<Row, V> = {
  [C in Cols<Row>]-?: [NonNullable<Row[C]>] extends [V] ? C : never;
}[Cols<Row>];
type Val<Row, C extends keyof Row> = NonNullable<Row[C]>;

/** One condition inside `or([...])`: `[column, operator, value]`, typed per column. */
export type OrCondition<Row> = {
  [C in Cols<Row>]:
    | readonly [C, "eq" | "neq", Val<Row, C>]
    | (C extends ColsOf<Row, string | number>
        ? readonly [C, "gt" | "gte" | "lt" | "lte", Val<Row, C>]
        : never)
    | (C extends ColsOf<Row, string> ? readonly [C, "like" | "ilike", string] : never)
    | readonly [C, "in", readonly Val<Row, C>[]]
    | readonly [C, "is", null | "notnull"];
}[Cols<Row>];

/** Chainable query over rows of type `Row`, resolving to `Out` rows (`Shape` picks array/one/maybe). */
export interface Query<Row, Out, Shape extends "many" | "one" | "maybe" = "many">
  extends PromiseLike<
    JordResult<Shape extends "many" ? Out[] : Shape extends "one" ? Out : Out | null>
  > {
  /** `col = value` (use `is(col, null)` for NULL). */
  eq<C extends Cols<Row>>(column: C, value: Val<Row, C>): this;
  neq<C extends Cols<Row>>(column: C, value: Val<Row, C>): this;
  /** Ordering operators: only number/string columns (not boolean or json). */
  gt<C extends ColsOf<Row, string | number>>(column: C, value: Val<Row, C>): this;
  gte<C extends ColsOf<Row, string | number>>(column: C, value: Val<Row, C>): this;
  lt<C extends ColsOf<Row, string | number>>(column: C, value: Val<Row, C>): this;
  lte<C extends ColsOf<Row, string | number>>(column: C, value: Val<Row, C>): this;
  /** `col IN (...)`; server cap is 100 values. */
  in<C extends Cols<Row>>(column: C, values: readonly Val<Row, C>[]): this;
  /** `LIKE` / case-insensitive `LIKE`; string columns only. */
  like<C extends ColsOf<Row, string>>(column: C, pattern: string): this;
  ilike<C extends ColsOf<Row, string>>(column: C, pattern: string): this;
  /** `IS NULL` / `IS NOT NULL`. */
  is<C extends Cols<Row>>(column: C, value: null | "notnull"): this;
  /** Any-of group: `or([['a','eq',1],['b','in',[2,3]]])` -> `or=(a.eq.1,b.in.(2,3))`. */
  or(conditions: readonly OrCondition<Row>[]): this;
  /** Order by a column of this table; repeat for tie-breakers. */
  order<C extends Cols<Row>>(column: C, options?: { ascending?: boolean }): this;
  limit(count: number): this;
  /** Inclusive row range, like supabase: `range(0, 9)` = first 10 rows. */
  range(from: number, to: number): this;
  /** Ask the server for a total (`Prefer: count=`). */
  count(mode?: "exact" | "planned"): this;
  /** Start/continue keyset mode; `''` starts. The result carries `nextCursor` / `hasMore`. */
  cursor(token?: string): this;
  /** Exactly one row, otherwise `error` (status 406). */
  single(): Query<Row, Out, "one">;
  /** Zero or one row (`data: null` on none); more than one is an error. */
  maybeSingle(): Query<Row, Out, "maybe">;
  /** Walk every keyset page; stops after an error page or `hasMore === false`. */
  paginate(options?: { pageSize?: number }): AsyncGenerator<JordResult<Out[]>, void, void>;
}

/** Insert/update/delete: a {@link Query} that can also pick the returned projection. */
export interface MutationQuery<DB, K extends keyof DB & string, Out>
  extends Query<RowOf<DB, K>, Out, "many"> {
  /** Choose returned columns (default: the full Row). */
  select<const S extends string = "*">(
    columns?: SelectArg<DB, K, S>,
  ): MutationQuery<DB, K, ParseSelect<DB, K, S>>;
}

/** Typed handle for one table. */
export interface TableClient<DB, K extends keyof DB & string> {
  select<const S extends string = "*">(
    columns?: SelectArg<DB, K, S>,
  ): Query<RowOf<DB, K>, ParseSelect<DB, K, S>, "many">;
  /** One request. Pass an array for a batch (the server currently accepts one object per request). */
  insert(values: InsertOf<DB, K> | InsertOf<DB, K>[]): MutationQuery<DB, K, RowOf<DB, K>>;
  /** Needs at least one filter, or the server answers 400. */
  update(patch: UpdateOf<DB, K>): MutationQuery<DB, K, RowOf<DB, K>>;
  /** Needs at least one filter, or the server answers 400. */
  delete(): MutationQuery<DB, K, RowOf<DB, K>>;
}

/** Client returned by `createClient<Database>()`. */
export interface TypedClient<DB> {
  /** `from('public.users')`, or `from('users')` for the `public` schema. */
  from<K extends TableKeys<DB>>(table: K): TableClient<DB, K>;
  from<N extends PublicNames<DB>>(table: N): TableClient<DB, `public.${N}` & keyof DB & string>;
}

export interface CreateClientOptions {
  /** Server base URL, e.g. `http://127.0.0.1:8787`. */
  url: string;
  /** API key / access token; sent as `apikey` and `Authorization: Bearer`. */
  key: string;
  fetch?: typeof fetch;
}
