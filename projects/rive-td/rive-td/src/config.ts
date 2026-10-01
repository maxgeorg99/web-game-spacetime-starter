export type GameConfig = { uri: string; database: string; riveReady: boolean; pageUrl?: string };
// itch.io serves games in a nested iframe directory. Keep every asset relative.
export function assetUrl(file: string): string { return new URL(file, document.baseURI).href; }
export function saved(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
export function save(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* Storage may be disabled in embedded games. */ }
}
