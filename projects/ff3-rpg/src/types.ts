export interface ImageEntry {
  key: string;
  path: string;
  type: 'image';
}

export interface SpritesheetEntry {
  key: string;
  path: string;
  type: 'spritesheet';
  frameWidth: number;
  frameHeight: number;
}

export interface AudioEntry {
  key: string;
  path: string;
  type: 'audio';
}

export type AssetEntry = ImageEntry | SpritesheetEntry | AudioEntry;

export interface AssetManifest {
  images: ImageEntry[];
  spritesheets: SpritesheetEntry[];
  audio: AudioEntry[];
}
