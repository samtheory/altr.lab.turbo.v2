export type BlobObject = {
  id: string;
  bucket: string;
  key: string;
  content_type: string;
  size: number;
  etag: string;
  created_at: number;
  updated_at: number;
};

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
