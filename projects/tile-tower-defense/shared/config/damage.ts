/** Reference project's attack/defense matrix. Untyped legacy hits retain their original damage. */
export const damageMatrix = {
  blunt: { armor: 1.25, agility: 0.85, mystical: 1.1 },
  pierce: { armor: 0.8, agility: 1.25, mystical: 0.9 },
  divine: { armor: 1, agility: 0.9, mystical: 1.3 },
  magic: { armor: 0.85, agility: 1.1, mystical: 1.25 },
} as const;
export type AttackType = keyof typeof damageMatrix;
export type DefenseType = keyof (typeof damageMatrix)['blunt'];
export function damageMultiplier(attack?: AttackType, defense?: DefenseType): number {
  return attack && defense ? damageMatrix[attack][defense] : 1;
}
