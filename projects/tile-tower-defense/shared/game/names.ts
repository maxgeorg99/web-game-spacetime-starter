/** Plain player-facing names, validated on both database boundaries. */
export function cleanName(value: string, label = 'Captain name', maximum = 24): string {
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > maximum || /[<>\p{Cc}\p{Cf}]/u.test(name)) {
    throw Error(`${label} must be 2–${maximum} characters without markup or control characters.`);
  }
  return name;
}
