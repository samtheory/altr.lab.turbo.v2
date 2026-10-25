import { isStudioOpenBypass } from "./auth/config";

/** Local-dev gate only — real auth is Studio S3. */
export function isStudioOpen(): boolean {
  return isStudioOpenBypass();
}
