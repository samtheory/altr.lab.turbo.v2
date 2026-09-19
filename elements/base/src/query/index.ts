/**
 * Query / data-access stub — place shared query builders or TanStack Query helpers here later.
 */

export type QueryResult<T> = {
  data: T | null;
  error: Error | null;
};

export async function stubQuery<T>(
  _key: string,
): Promise<QueryResult<T>> {
  return { data: null, error: null };
}
