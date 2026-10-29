/** Resolve public assets relative to the game's deployment directory. */
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
