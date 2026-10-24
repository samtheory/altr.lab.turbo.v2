import { isValidBlobBucket } from "../blobs/names.js";

/** Reuse blob-bucket slug rules for vector namespaces. */
export function isValidVectorNamespace(name: string): boolean {
  return isValidBlobBucket(name);
}
