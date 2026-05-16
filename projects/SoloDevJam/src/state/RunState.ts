import { getStarterDeck } from "../cards/cards";
import type { Card } from "../cards/Card";
import { MapNode, generateMap } from "./MapState";
import {
  pickCombatEncounter,
  pickEliteEncounter,
  pickBossEncounter,
} from "../data/enemies";
import { getHighestUnlockedAscension } from "./AscensionState";

export class RunState {
  nodes: MapNode[];
  currentNodeId: string | null;
  playerHp: number;
  playerMaxHp: number;
  deck: Card[];
  ascension: number;
  highestUnlocked: number;

  constructor(ascension = 0) {
    this.nodes = generateMap(ascension >= 3);
    for (const node of this.nodes) {
      const pick = node.kind === "boss" ? pickBossEncounter
        : node.kind === "elite" ? pickEliteEncounter
        : pickCombatEncounter;
      node.encounterTemplates = pick();
    }
    this.currentNodeId = null;
    this.deck = getStarterDeck();
    const hpPenalty = ascension >= 2 ? 5 : 0;
    this.playerHp = 25 - hpPenalty;
    this.playerMaxHp = 25 - hpPenalty;
    this.ascension = ascension;
    this.highestUnlocked = getHighestUnlockedAscension();
  }

  get currentNode(): MapNode | null {
    if (this.currentNodeId === null) return null;
    return this.nodes.find((n) => n.id === this.currentNodeId) ?? null;
  }

  get availableNodes(): MapNode[] {
    if (this.currentNodeId === null) {
      return this.nodes.filter((n) => n.tier === 1);
    }
    const cur = this.currentNode;
    if (!cur) return [];
    return cur.connections
      .map((id) => this.nodes.find((n) => n.id === id))
      .filter((n): n is MapNode => n !== undefined && !n.cleared);
  }

  markNodeCleared(nodeId: string): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.cleared = true;
      this.currentNodeId = nodeId;
    }
  }

  get isBossCleared(): boolean {
    return this.nodes.some((n) => n.kind === "boss" && n.cleared);
  }
}
