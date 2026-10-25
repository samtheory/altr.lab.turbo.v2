import type { JordDriverPort, JordPolicyOperation } from "@altr/jord";

import type { Principal } from "../auth/principal.js";
import { allowsWriteBlobs } from "../auth/access.js";
import { evaluatePolicies } from "../policies/evaluate.js";
import { policiesDisabledFromEnv } from "../policies/index.js";

const BLOBS_TABLE = "jord_blobs";

export type SignPolicyDecision =
  | { allowed: true }
  | { allowed: false; status: 403; reason: string };

/**
 * Policy is checked when the URL is minted, not only when bytes are later fetched.
 */
export async function assertSignAllowed(input: {
  jord: JordDriverPort;
  principal: Principal;
  bucket: string;
  intent: "upload" | "download";
  env?: NodeJS.ProcessEnv;
}): Promise<SignPolicyDecision> {
  const { principal } = input;

  if (input.intent === "upload" && !allowsWriteBlobs(principal)) {
    return {
      allowed: false,
      status: 403,
      reason: "role cannot write blobs",
    };
  }

  if (principal.kind === "user" || principal.kind === "anon") {
    // Route matrix keeps end-user principals off /blobs today; defend in depth.
    return {
      allowed: false,
      status: 403,
      reason: "principal cannot sign blob urls",
    };
  }

  const operation: JordPolicyOperation =
    input.intent === "upload" ? "insert" : "select";

  const decision = await evaluatePolicies({
    jord: input.jord,
    tableName: BLOBS_TABLE,
    operation,
    role: principal.role,
    bucket: input.bucket,
    disabled: policiesDisabledFromEnv(input.env),
    bypass: principal.kind === "service",
    subject: principal.kind,
    uid: principal.uid ?? null,
    claims: principal.claims,
  });

  if (!decision.allowed) {
    return {
      allowed: false,
      status: 403,
      reason: decision.reason ?? "policy_denied",
    };
  }

  return { allowed: true };
}
