import { migrateMages } from './magic';
import { recruitableUnits } from '../config/bevy-units';
import { balance, unitDef } from '../config';
import { expeditions, worldBalance, worldIslands } from '../config/world';
import { draftOffers } from './drafting';
import { fresh, command, expansionCells } from './rules';
import { step } from './combat';
import type { Command, State } from './model';

export interface WorldSeat {
  name?: string;
  slot: number;
  owner: string | null;
  sequence: number;
  cycles: number;
  state: State;
}
export interface Flight {
  id: number;
  from: number;
  to: number;
  unit: string;
  remaining: number;
  count: number;
  elapsed: number;
  nextSpawn: number;
}
export interface WorldState {
  version: 1;
  seats: WorldSeat[];
  flights: Flight[];
  nextFlight: number;
}
export type WorldAction = Command | { type: 'send'; target: number; kind: string; count: number };
export function freshWorld(): WorldState {
  return {
    version: 1,
    seats: worldIslands.map((island) => ({
      slot: island.slot,
      owner: null,
      sequence: 0,
      cycles: 0,
      state: fresh(),
    })),
    flights: [],
    nextFlight: 1,
  };
}
export function joinWorld(
  world: WorldState,
  owner: string,
  previous?: State,
  name?: string,
): WorldState {
  const existing = world.seats.find((seat) => seat.owner === owner);
  if (existing) {
    if (!name || existing.name === name) {
      return world;
    }
    const renamed: WorldState = JSON.parse(JSON.stringify(world));
    renamed.seats[existing.slot].name = name;
    return renamed;
  }
  const next: WorldState = JSON.parse(JSON.stringify(world));
  const seat = next.seats.find((seat) => !seat.owner);
  if (!seat) {
    return world;
  } // A fifth identity can spectate without taking ownership.
  seat.owner = owner;
  if (name) {
    seat.name = name;
  }
  seat.state = previous ?? fresh();
  continueCampaign(seat);
  return next;
}
export function worldCommand(
  world: WorldState,
  owner: string,
  sequence: number,
  action: WorldAction,
): WorldState {
  const next: WorldState = JSON.parse(JSON.stringify(world));
  const seat = next.seats.find((seat) => seat.owner === owner);
  if (!seat) {
    throw Error('This world is full. You can watch, but do not own an island.');
  }
  if (seat.sequence !== sequence) {
    throw Error('Your island changed. Try the order again.');
  }
  if (action.type === 'send') {
    if (!recruitableUnits.some((unit) => unit.id === action.kind)) {
      throw Error('Only the eight recruitable soldiers can be sent.');
    }
    const opponent = next.seats.find((candidate) => candidate.slot === action.target);
    const definition = expeditions.find((def) => def.unit === action.kind);
    if (!opponent?.owner || opponent.slot === seat.slot || opponent.state.phase === 'lost') {
      throw Error('Choose another occupied, surviving island.');
    }
    if (seat.state.phase === 'lost') {
      throw Error('Rebuild your keep before sending an expedition.');
    }
    if (
      !definition ||
      !Number.isInteger(action.count) ||
      action.count < 1 ||
      action.count > worldBalance.maxFlightUnits
    ) {
      throw Error('Choose a valid unit and 1–6 passengers.');
    }
    if (
      next.flights.filter((flight) => flight.from === seat.slot).length >=
      worldBalance.maxFlightsPerCaptain
    ) {
      throw Error('All three airships are already in flight.');
    }
    const inbound = next.flights
      .filter((flight) => flight.to === opponent.slot)
      .reduce((sum, flight) => sum + flight.remaining, 0);
    if (inbound + opponent.state.enemies.length + action.count > worldBalance.maxIncomingUnits) {
      throw Error('That island already has too many incoming units.');
    }
    const cost = definition.meatCost * action.count;
    if (seat.state.meat < cost) {
      throw Error('Not enough meat for this expedition.');
    }
    seat.state.meat -= cost;
    next.flights.push({
      id: next.nextFlight++,
      from: seat.slot,
      to: opponent.slot,
      unit: definition.unit,
      count: action.count,
      remaining: action.count,
      elapsed: 0,
      nextSpawn: 0,
    });
  } else {
    if (action.type === 'recruit') {
      throw Error('Choose an opponent in Recruit to send an expedition.');
    }
    if (
      action.type === 'restart' &&
      next.flights.some((flight) => flight.to === seat.slot || flight.from === seat.slot)
    ) {
      throw Error('Wait until your airships have resolved before rebuilding.');
    }
    seat.state = command(seat.state, action);
  }
  seat.sequence++;
  return next;
}
function continueCampaign(seat: WorldSeat) {
  if (seat.state.phase !== 'won') {
    return;
  }
  seat.cycles++;
  seat.state.wave = 0;
  seat.state.phase = expansionCells(seat.state).length ? 'draft' : 'prepare';
  seat.state.offers = seat.state.phase === 'draft' ? draftOffers(seat.state) : [];
}
/** Advance every occupied island, including unattended defenses, with one authoritative clock. */
export function stepWorld(world: WorldState): boolean {
  let changed = false;
  for (const seat of world.seats) changed = migrateMages(seat.state) || changed;
  for (const flight of world.flights) {
    changed = true;
    flight.elapsed += balance.tickSeconds;
    const destination = world.seats[flight.to];
    if (!destination?.owner || destination.state.phase === 'lost') {
      flight.remaining = 0;
      continue;
    }
    if (flight.elapsed < worldBalance.flightSeconds) {
      continue;
    }
    flight.nextSpawn -= balance.tickSeconds;
    if (flight.nextSpawn > 0 || flight.remaining <= 0) {
      continue;
    }
    const definition = unitDef(flight.unit);
    const expedition = expeditions.find((def) => def.unit === flight.unit)!;
    destination.state.enemies.push({
      id: destination.state.nextId++,
      kind: definition.id,
      captainSlot: flight.from,
      progress: 0,
      health: definition.health,
      maxHealth: definition.health,
      cooldown: 0,
      reward: expedition.bounty,
      leak: expedition.keepDamage,
    });
    flight.remaining--;
    flight.nextSpawn += worldBalance.landingInterval;
  }
  world.flights = world.flights.filter((flight) => flight.remaining > 0);
  for (const seat of world.seats) {
    if (!seat.owner || seat.state.phase === 'lost') {
      continue;
    }
    if (seat.state.impacts.length) {
      seat.state.impacts = [];
      changed = true;
    }
    if (
      seat.state.phase === 'combat' ||
      seat.state.enemies.length ||
      seat.state.projectiles.length
    ) {
      step(seat.state, true);
      continueCampaign(seat);
      changed = true;
    }
  }
  return changed;
}
