import type { CampaignId } from './campaigns';
import { tiles, type TileId } from './island';
import { atmosphere } from './presentation';

export const biomeIds = ['sky', 'volcano', 'ocean', 'highlands'] as const;
export type BiomeId = (typeof biomeIds)[number];
interface BiomeDef {
  campaign: CampaignId;
  thumbnail: string;
  terrain: Record<TileId, number>;
  road: number;
  cliffLeft: number;
  cliffRight: number;
  edge: number;
  paving: number;
  sky: {
    skyTop: string;
    skyMiddle: string;
    skyBottom: string;
    cloudLight: string;
    cloudShade: string;
    cloudCount: number;
  };
}
const skyTerrain = Object.fromEntries(tiles.map((tile) => [tile.id, tile.color])) as Record<
  TileId,
  number
>;
export const biomes: Record<BiomeId, BiomeDef> = {
  sky: {
    campaign: 'sky-v1',
    thumbnail: 'biomes/sky.svg',
    terrain: skyTerrain,
    road: 0xc8b991,
    cliffLeft: 0x82765a,
    cliffRight: 0x5e6652,
    edge: 0xc9d59a,
    paving: 0xb2a17c,
    sky: atmosphere,
  },
  volcano: {
    campaign: 'volcano-v1',
    thumbnail: 'biomes/volcano.svg',
    terrain: {
      meadow: 0x655952,
      forest: 0x655f4c,
      farm: 0x8c7356,
      quarry: 0x827e80,
      orchard: 0x807052,
      watchpost: 0x938375,
      shrine: 0x796477,
      relic: 0xb88755,
      windmill: 0x80776e,
    },
    road: 0xba9978,
    cliffLeft: 0x51413f,
    cliffRight: 0x352f36,
    edge: 0x9c7862,
    paving: 0x98795f,
    sky: {
      skyTop: '#302c3c',
      skyMiddle: '#654448',
      skyBottom: '#c07955',
      cloudLight: '#b7a4a2',
      cloudShade: '#776a78',
      cloudCount: 14,
    },
  },
  ocean: {
    campaign: 'ocean-v1',
    thumbnail: 'biomes/ocean.svg',
    terrain: {
      meadow: 0x547f7a,
      forest: 0x446e66,
      farm: 0x7c9c81,
      quarry: 0x738e9f,
      orchard: 0x699686,
      watchpost: 0x8fa8ac,
      shrine: 0x768da8,
      relic: 0xa4b998,
      windmill: 0x799ca3,
    },
    road: 0xc0c2a1,
    cliffLeft: 0x3b626d,
    cliffRight: 0x294752,
    edge: 0x8fb8aa,
    paving: 0x9ca98c,
    sky: {
      skyTop: '#337f89',
      skyMiddle: '#17485f',
      skyBottom: '#102a43',
      cloudLight: '#9dd2cd',
      cloudShade: '#376b7d',
      cloudCount: 0,
    },
  },
  highlands: {
    campaign: 'highlands-v1',
    thumbnail: 'biomes/highlands.svg',
    terrain: {
      meadow: 0x85865d,
      forest: 0x647759,
      farm: 0xa39663,
      quarry: 0x858c94,
      orchard: 0x83935e,
      watchpost: 0x9d9a83,
      shrine: 0x8b8797,
      relic: 0xb8a576,
      windmill: 0x969b7e,
    },
    road: 0xd0b98d,
    cliffLeft: 0x697078,
    cliffRight: 0x474f5a,
    edge: 0xb5bb87,
    paving: 0xac9c7c,
    sky: {
      skyTop: '#7b9ba7',
      skyMiddle: '#b1c1bf',
      skyBottom: '#d9d8be',
      cloudLight: '#e1e5d6',
      cloudShade: '#b1c5c4',
      cloudCount: 7,
    },
  },
};
export function biomeDef(id: string = 'sky'): BiomeDef {
  if (!Object.hasOwn(biomes, id)) {
    throw Error('Unsupported biome. Update the game to continue.');
  }
  return biomes[id as BiomeId];
}
export function campaignBiome(campaign?: CampaignId): BiomeId {
  if (campaign === undefined) {
    return 'sky';
  }
  const id = biomeIds.find((id) => biomes[id].campaign === campaign);
  if (!id) {
    throw Error('Unsupported campaign. Update the game to continue.');
  }
  return id;
}
