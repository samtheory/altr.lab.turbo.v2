/** Local-dev gate only — real auth is Studio S3. */
export function isStudioOpen(): boolean {
  return process.env.JORD_STUDIO_OPEN === "1";
}
