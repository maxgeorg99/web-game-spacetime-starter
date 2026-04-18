export interface BattleActor {
  id: string;
  name: string;
  isEnemy: boolean;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  spriteKey: string;
  frameSize: number;
  alive: boolean;
  defending: boolean;
  /** Index in party or enemy array */
  index: number;
}

export type ActionType = 'attack' | 'magic' | 'defend';

export interface BattleAction {
  actorId: string;
  type: ActionType;
  targetId?: string;
  spellId?: string;
}

export type BattleState =
  | 'COMMAND_SELECT'
  | 'TARGET_SELECT'
  | 'MAGIC_SELECT'
  | 'EXECUTING'
  | 'VICTORY'
  | 'DEFEAT';
