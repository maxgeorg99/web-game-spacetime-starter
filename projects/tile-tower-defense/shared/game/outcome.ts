import type { WorldState } from './world';
export type MatchOutcome = 'victory' | 'defeat' | 'draw';
export function matchOutcome(
  world: WorldState | undefined,
  slot: number | null,
): MatchOutcome | undefined {
  if (!world?.round || slot === null) {
    return;
  }
  const seat = world.seats.find((seat) => seat.slot === slot && seat.owner);
  if (!seat) {
    return;
  }
  if (seat.state.phase === 'lost') {
    return 'defeat';
  }
  if (world.round.phase !== 'finished') {
    return;
  }
  const survivors = world.seats.filter((seat) => seat.owner && seat.state.phase !== 'lost');
  return survivors.length === 1 && survivors[0].slot === slot ? 'victory' : 'draw';
}
