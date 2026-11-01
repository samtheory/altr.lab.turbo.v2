import { createHash, randomBytes } from "node:crypto";

import type { JordProjectKeyKind } from "@altr/jord";

export type GeneratedProjectKey = {
  kind: JordProjectKeyKind;
  /** Full plaintext key — return to client only once. */
  plaintext: string;
  keyHash: string;
  prefix: string;
  last4: string;
};

const PREFIX: Record<JordProjectKeyKind, string> = {
  publishable: "jord_pub_",
  secret: "jord_sec_",
  barrier: "jord_bar_",
};

export function hashProjectKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

export function generateProjectKey(kind: JordProjectKeyKind): GeneratedProjectKey {
  const plaintext = `${PREFIX[kind]}${randomBytes(24).toString("base64url")}`;
  return {
    kind,
    plaintext,
    keyHash: hashProjectKey(plaintext),
    prefix: plaintext.slice(0, Math.min(12, plaintext.length)),
    last4: plaintext.slice(-4),
  };
}

export function generateProjectKeySet(): {
  publishable: GeneratedProjectKey;
  secret: GeneratedProjectKey;
  barrier: GeneratedProjectKey;
} {
  return {
    publishable: generateProjectKey("publishable"),
    secret: generateProjectKey("secret"),
    barrier: generateProjectKey("barrier"),
  };
}
