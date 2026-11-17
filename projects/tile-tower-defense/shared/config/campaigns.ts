import { highlandsWaves } from './campaigns/highlands';
import { waves } from './waves';
import { oceanWaves } from './campaigns/ocean';
import { volcanoWaves } from './campaigns/volcano';
import type { WaveDef } from './types';

export const campaigns = {
  'sky-v1': waves,
  'volcano-v1': volcanoWaves,
  'ocean-v1': oceanWaves,
  'highlands-v1': highlandsWaves,
} as const;
export type CampaignId = keyof typeof campaigns;
export function campaignWaves(id: string = 'sky-v1'): readonly WaveDef[] {
  if (!Object.hasOwn(campaigns, id)) {
    throw Error('Unsupported campaign. Update the game to continue.');
  }
  return campaigns[id as CampaignId];
}
