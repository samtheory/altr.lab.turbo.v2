import { describe, expect, it } from "vitest";

import {
  isValidBlobBucket,
  isValidBlobKey,
  normalizeContentType,
} from "./names.js";

describe("blob names", () => {
  it("accepts valid buckets", () => {
    expect(isValidBlobBucket("lab")).toBe(true);
    expect(isValidBlobBucket("a")).toBe(true);
    expect(isValidBlobBucket("my-bucket_1")).toBe(true);
  });

  it("rejects invalid buckets", () => {
    expect(isValidBlobBucket("")).toBe(false);
    expect(isValidBlobBucket("Lab")).toBe(false);
    expect(isValidBlobBucket("-bad")).toBe(false);
    expect(isValidBlobBucket("has space")).toBe(false);
  });

  it("accepts nested keys without traversal", () => {
    expect(isValidBlobKey("file.txt")).toBe(true);
    expect(isValidBlobKey("folder/file.txt")).toBe(true);
  });

  it("rejects path traversal and absolute keys", () => {
    expect(isValidBlobKey("../x")).toBe(false);
    expect(isValidBlobKey("a/../b")).toBe(false);
    expect(isValidBlobKey("/abs")).toBe(false);
    expect(isValidBlobKey("")).toBe(false);
    expect(isValidBlobKey("a//b")).toBe(false);
  });

  it("normalizes content type", () => {
    expect(normalizeContentType(undefined)).toBe("application/octet-stream");
    expect(normalizeContentType(" text/plain ")).toBe("text/plain");
  });
});
