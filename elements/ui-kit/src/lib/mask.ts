/**
 * Apolyx mask engine. Pure functions, no DOM.
 *
 * Mask syntax: `9` digit · `a` letter · `*` letter or digit · `\` escapes the
 * next character as a literal · `[...]` marks an optional section. Custom
 * tokens map a character to a single-character RegExp.
 *
 * Literals are inserted lazily (only once a token after them is filled), so a
 * formatted value is always a prefix of the mask template. That keeps caret
 * mapping a matter of counting tokens.
 */

export type MaskTokens = Record<string, RegExp>;

export const defaultMaskTokens: MaskTokens = {
  "9": /\d/,
  a: /[A-Za-z]/,
  "*": /[A-Za-z0-9]/,
};

export type MaskPart =
  | { kind: "token"; char: string; test: RegExp; optional: boolean }
  | { kind: "literal"; char: string; optional: boolean };

/** A mask string, or a function that picks one from the raw value (e.g. by card brand). */
export type MaskSource = string | ((raw: string) => string);

const parseCache = new Map<string, MaskPart[]>();

export function parseMask(mask: string, tokens: MaskTokens = defaultMaskTokens): MaskPart[] {
  const useCache = tokens === defaultMaskTokens;
  if (useCache) {
    const cached = parseCache.get(mask);
    if (cached) return cached;
  }
  const parts: MaskPart[] = [];
  let optional = false;
  for (let i = 0; i < mask.length; i++) {
    const ch = mask[i]!;
    if (ch === "\\" && i + 1 < mask.length) {
      parts.push({ kind: "literal", char: mask[++i]!, optional });
    } else if (ch === "[") {
      optional = true;
    } else if (ch === "]") {
      optional = false;
    } else if (tokens[ch]) {
      parts.push({ kind: "token", char: ch, test: tokens[ch], optional });
    } else {
      parts.push({ kind: "literal", char: ch, optional });
    }
  }
  if (useCache) parseCache.set(mask, parts);
  return parts;
}

function matches(test: RegExp, ch: string) {
  test.lastIndex = 0;
  return test.test(ch);
}

export function countTokens(parts: MaskPart[]) {
  let n = 0;
  for (const p of parts) if (p.kind === "token") n++;
  return n;
}

/** Characters of `text` that match any token — a first pass before the mask is known. */
export function roughRaw(text: string, tokens: MaskTokens = defaultMaskTokens) {
  const tests = Object.values(tokens);
  let out = "";
  for (const ch of text) if (tests.some((t) => matches(t, ch))) out += ch;
  return out;
}

export function resolveMask(source: MaskSource, raw: string) {
  return typeof source === "function" ? source(raw) : source;
}

/** Formats raw token characters. Invalid characters are skipped, extras dropped. */
export function applyMask(raw: string, parts: MaskPart[]) {
  let out = "";
  let pending = "";
  let r = 0;
  for (const part of parts) {
    if (r >= raw.length) break;
    if (part.kind === "literal") {
      pending += part.char;
      continue;
    }
    while (r < raw.length && !matches(part.test, raw[r]!)) r++;
    if (r >= raw.length) break;
    out += pending + raw[r];
    pending = "";
    r++;
  }
  return out;
}

/**
 * Reads raw token characters back out of any text (typed, pasted, or
 * formatted). Literals at their mask position are skipped; anything that
 * fits neither the literal nor the next token is dropped.
 */
export function unmask(text: string, parts: MaskPart[]) {
  let raw = "";
  let p = 0;
  for (const ch of text) {
    if (p >= parts.length) break;
    let k = p;
    let consumed = false;
    while (k < parts.length && parts[k]!.kind === "literal") {
      if (parts[k]!.char === ch) {
        p = k + 1;
        consumed = true;
        break;
      }
      k++;
    }
    if (consumed) continue;
    const token = parts[k];
    if (token && token.kind === "token" && matches(token.test, ch)) {
      raw += ch;
      p = k + 1;
    }
  }
  return raw;
}

/** The full template with tokens shown as `placeholderChar`. */
export function maskGuide(parts: MaskPart[], placeholderChar = "_") {
  return parts.map((p) => (p.kind === "token" ? placeholderChar : p.char)).join("");
}

/** True when every required token has a character. */
export function isMaskComplete(raw: string, parts: MaskPart[]) {
  let required = 0;
  for (const p of parts) if (p.kind === "token" && !p.optional) required++;
  return raw.length >= required;
}

/**
 * Caret index in `formatted` that sits after `rawCount` token characters,
 * skipping literals that are already shown after it.
 */
export function caretFromRaw(parts: MaskPart[], formatted: string, rawCount: number) {
  let tokens = 0;
  let i = 0;
  if (rawCount > 0) {
    for (; i < formatted.length; i++) {
      if (parts[i]?.kind === "token") tokens++;
      if (tokens === rawCount) {
        i++;
        break;
      }
    }
  }
  while (i < formatted.length && parts[i]?.kind === "literal") i++;
  return Math.min(i, formatted.length);
}

export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "unknown";

export function detectCardBrand(raw: string): CardBrand {
  const digits = raw.replace(/\D/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(6011|65|64[4-9])/.test(digits)) return "discover";
  return "unknown";
}

export const masks = {
  phoneUS: "(999) 999-9999",
  date: "99/99/9999",
  time: "99:99",
  card: (raw: string) => (detectCardBrand(raw) === "amex" ? "9999 999999 99999" : "9999 9999 9999 9999"),
  expiry: "99/99",
  cvc: "999[9]",
  zipUS: "99999[-9999]",
} satisfies Record<string, MaskSource>;
