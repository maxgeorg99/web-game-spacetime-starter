import { getStarterDeck } from "../cards/cards";
import type { Card } from "../cards/Card";
import { MapNode, generateMap } from "./MapState";
import {
  pickCombatEncounter, pickEliteEncounter, pickBossEncounter,
} from "../data/enemies";

export class RunState {
  nodes: MapNode[];
  currentNodeId: string | null;
  playerHp: number;
  playerMaxHp: number;
  deck: Card[];
  gold: number;

  constructor() {
    this.nodes = generateMap();
    for (const node of this.nodes) {
      const pick = node.kind === "boss" ? pickBossEncounter
        : node.kind === "elite" ? pickEliteEncounter
        : pickCombatEncounter;
      node.encounterTemplates = pick();
    }
    this.currentNodeId = null;
    this.deck = getStarterDeck();
    this.playerHp = 25;
    this.playerMaxHp = 25;
    this.gold = 0;
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
