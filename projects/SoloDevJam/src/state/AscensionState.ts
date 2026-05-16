const STORAGE_KEY = "payinblood_highest_ascension";

export function getHighestUnlockedAscension(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return 0;
    const val = parseInt(raw, 10);
    return Number.isFinite(val) && val >= 0 ? val : 0;
  } catch {
    return 0;
  }
}

export function unlockNextAscension(): number {
  const current = getHighestUnlockedAscension();
  const next = Math.min(current + 1, 3);
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // localStorage unavailable — silent fail
  }
  return next;
}
