/** Normalize Neon query results for typed access. */
export function asRows<T>(result: unknown): T[] {
  return result as T[];
}

export function firstRow<T>(result: unknown): T | undefined {
  return asRows<T>(result)[0];
}
