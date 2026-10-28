const PLACEHOLDER_MARKERS = [
  "change-me",
  "changeme",
  "placeholder",
  "replace-with",
  "your-secret",
  "example-key",
];

export function isStrongServerSecret(value: string | undefined): value is string {
  const secret = value?.trim();
  if (!secret || secret.length < 32) return false;
  if (PLACEHOLDER_MARKERS.some((marker) => secret.toLowerCase().includes(marker))) {
    return false;
  }

  const frequencies = new Map<string, number>();
  for (const character of secret) {
    frequencies.set(character, (frequencies.get(character) || 0) + 1);
  }
  const entropy = [...frequencies.values()].reduce((total, count) => {
    const probability = count / secret.length;
    return total - probability * Math.log2(probability);
  }, 0);

  return entropy >= 4.5 && frequencies.size >= 16;
}
