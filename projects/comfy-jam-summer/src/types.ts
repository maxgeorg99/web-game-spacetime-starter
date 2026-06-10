export interface ManifestSpritesheet {
  id: string;
  keyPrefix: string;
  frameWidth: number;
  frameHeight: number;
  animations: Array<{
    suffix: string;
    path: string;
    endFrame: number;
    frameRate: number;
    repeat: number;
  }>;
}

export interface ManifestEntry {
  spritesheets: ManifestSpritesheet[];
  images: Array<{ key: string; path: string }>;
  audio: Array<{ key: string; path: string }>;
}
