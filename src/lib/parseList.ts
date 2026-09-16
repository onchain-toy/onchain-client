// Parses a comma-separated list of non-negative integers (badge ids or
// amounts) typed into a single text input for the batch forms. Returns
// null when the text isn't a clean comma-separated list of integers, so
// the caller can tell "empty" apart from "malformed" and block submit.
export function parseBigIntList(value: string): bigint[] | null {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(",").map((s) => s.trim());
  if (parts.some((p) => !/^\d+$/.test(p))) return null;

  return parts.map((p) => BigInt(p));
}
