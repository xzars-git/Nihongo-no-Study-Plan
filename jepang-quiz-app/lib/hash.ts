// FNV-1a: fast, stable, good-enough string hash for local IDs (deck ids,
// per-question SRS ids). Not cryptographic — collisions are not a security
// concern here, only used to key localStorage records.
export function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
