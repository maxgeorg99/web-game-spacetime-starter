/** Client-only mix settings. Files live inside this project's public/audio directory. */
export const soundCues = {
  click: { file: 'click.mp3', gain: 0.3, cooldownMs: 100 },
  error: { file: 'error.mp3', gain: 0.45, cooldownMs: 500 },
  build: { file: 'build.mp3', gain: 0.45, cooldownMs: 150 },
  upgrade: { file: 'upgrade.mp3', gain: 0.4, cooldownMs: 200 },
  launch: { file: 'launch.mp3', gain: 0.25, cooldownMs: 100 },
  stone: { file: 'stone.ogg', gain: 0.4, cooldownMs: 180 },
  impact: { file: 'impact.mp3', gain: 0.2, cooldownMs: 120 },
  keep: { file: 'keep.mp3', gain: 0.5, cooldownMs: 400 },
  wave: { file: 'wave.mp3', gain: 0.4, cooldownMs: 1000 },
  defeat: { file: 'defeat.mp3', gain: 0.5, cooldownMs: 1500 },
  depart: { file: 'depart.mp3', gain: 0.4, cooldownMs: 300 },
} as const;
export type SoundCue = keyof typeof soundCues;
export const audioMix = {
  musicFile: 'music.mp3',
  musicGain: 0.5,
  defaultEffects: 0.55,
  defaultMusic: 0.15,
  maxVoices: 6,
  combatGapMs: 65,
} as const;
