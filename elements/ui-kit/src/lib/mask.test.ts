import { describe, expect, it } from "vitest";

import {
  applyMask,
  caretFromRaw,
  detectCardBrand,
  isMaskComplete,
  maskGuide,
  masks,
  parseMask,
  resolveMask,
  unmask,
} from "./mask";

const fmt = (raw: string, mask: string, tokens?: Parameters<typeof parseMask>[1]) =>
  applyMask(raw, parseMask(mask, tokens));

describe("mask engine", () => {
  it.each([
    ["5551234567", masks.phoneUS, "(555) 123-4567"],
    ["555", masks.phoneUS, "(555"],
    ["5551", masks.phoneUS, "(555) 1"],
    ["01022026", masks.date, "01/02/2026"],
    ["0930", masks.time, "09:30"],
    ["0428", masks.expiry, "04/28"],
    ["123", masks.cvc, "123"],
    ["1234", masks.cvc, "1234"],
    ["12345", masks.zipUS, "12345"],
    ["123456789", masks.zipUS, "12345-6789"],
    ["555123456789", masks.phoneUS, "(555) 123-4567"],
  ])("formats %s with %s", (raw, mask, expected) => {
    expect(fmt(raw, mask)).toBe(expected);
  });

  it("skips characters that do not fit the token", () => {
    expect(fmt("5a5b5", "999")).toBe("555");
    expect(fmt("ab12", "aa-99")).toBe("ab-12");
  });

  it("supports escapes and custom tokens", () => {
    expect(fmt("12", "\\#99")).toBe("#12");
    expect(fmt("ff00aa", "\\#HHHHHH", { H: /[0-9a-f]/i })).toBe("#ff00aa");
  });

  it("reads raw characters back from formatted or pasted text", () => {
    const phone = parseMask(masks.phoneUS);
    expect(unmask("(555) 123-4567", phone)).toBe("5551234567");
    expect(unmask("555.123.4567", phone)).toBe("5551234567");
    expect(unmask("(555) 1x23", phone)).toBe("555123");
  });

  it("tracks completeness with optional sections", () => {
    const zip = parseMask(masks.zipUS);
    expect(isMaskComplete("1234", zip)).toBe(false);
    expect(isMaskComplete("12345", zip)).toBe(true);
    expect(maskGuide(parseMask(masks.phoneUS))).toBe("(___) ___-____");
  });

  it("maps the caret past literals", () => {
    const phone = parseMask(masks.phoneUS);
    const formatted = "(555) 123-4567";
    expect(caretFromRaw(phone, formatted, 0)).toBe(1);
    expect(caretFromRaw(phone, formatted, 3)).toBe(6);
    expect(caretFromRaw(phone, formatted, 6)).toBe(10);
    expect(caretFromRaw(phone, "(555", 3)).toBe(4);
  });

  it("switches card layout by brand", () => {
    expect(fmt("4242424242424242", resolveMask(masks.card, "4242"))).toBe("4242 4242 4242 4242");
    expect(fmt("378282246310005", resolveMask(masks.card, "37"))).toBe("3782 822463 10005");
  });

  it.each([
    ["4242", "visa"],
    ["5555", "mastercard"],
    ["2221", "mastercard"],
    ["3782", "amex"],
    ["6011", "discover"],
    ["9999", "unknown"],
  ] as const)("detects %s as %s", (raw, brand) => {
    expect(detectCardBrand(raw)).toBe(brand);
  });
});
