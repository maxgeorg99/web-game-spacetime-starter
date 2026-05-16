import type { EnemyTemplate } from "../data/enemies";

export type NodeKind = "combat" | "elite" | "boss";

export interface MapNode {
  id: string;
  kind: NodeKind;
  tier: number;          // 1 = first fight, 5 = boss
  connections: string[]; // ids of tier+1 nodes reachable from here
  cleared: boolean;
  encounterTemplates: EnemyTemplate[];
}

export function generateMap(moreElites = false): MapNode[] {
  const nodes: MapNode[] = [];

  function mkNode(tier: number, kind: NodeKind): MapNode {
    const idx = nodes.filter((n) => n.tier === tier).length;
    const node: MapNode = { id: `t${tier}_${idx}`, kind, tier, connections: [], cleared: false, encounterTemplates: [] };
    nodes.push(node);
    return node;
  }

  // Tier 1: always 1 combat (single entry)
  mkNode(1, "combat");

  // Tiers 2–3: 2–3 nodes, at most 1 elite each
  for (const tier of [2, 3] as const) {
    const count = Math.random() < 0.5 ? 2 : 3;
    let eliteUsed = 0;
    const maxElites = moreElites ? 2 : 1;
    for (let i = 0; i < count; i++) {
      let kind: NodeKind = "combat";
      if (eliteUsed < maxElites && Math.random() < (moreElites ? 0.55 : 0.4)) {
        kind = "elite";
        eliteUsed++;
      }
      mkNode(tier, kind);
    }
  }

  // Tier 4: exactly 2 nodes, at least 1 combat
  if (moreElites || Math.random() < 0.4) {
    mkNode(4, "combat");
    mkNode(4, "elite");
  } else {
    mkNode(4, "combat");
    mkNode(4, "combat");
  }

  // Tier 5: single boss
  mkNode(5, "boss");

  // Wire connections tier → tier+1
  for (let tier = 1; tier <= 4; tier++) {
    const from = nodes.filter((n) => n.tier === tier);
    const to = nodes.filter((n) => n.tier === tier + 1);

    // Each source node connects to 1–2 destinations
    for (const src of from) {
      const shuffled = [...to].sort(() => Math.random() - 0.5);
      const count = Math.min(to.length, 1 + (Math.random() < 0.5 ? 1 : 0));
      src.connections = shuffled.slice(0, count).map((n) => n.id);
    }

    // Ensure every destination is reachable
    for (const dst of to) {
      const reachable = from.some((f) => f.connections.includes(dst.id));
      if (!reachable) {
        const src = from[Math.floor(Math.random() * from.length)];
        if (!src.connections.includes(dst.id)) src.connections.push(dst.id);
      }
    }
  }

  return nodes;
}
