export interface WeaponDef {
  name: string;
  icon: string;
  projSize: number;
  projSheet: string;
  projAnim: string;
  beam?: boolean;
  fireRate: number;
  damage: number;
  projectileSpeed: number;
  range: number;
  splash?: { radius: number; damagePercent: number };
  knockback?: number;
  bounce?: number;
}

export const WEAPONS: Record<string, WeaponDef> = {
  watergun: {
    name: "Watergun",
    icon: "proj-watergun",
    projSize: 16,
    projSheet: "water-ball-startup",
    projAnim: "water-ball-fly",
    fireRate: 0.4,
    damage: 5,
    projectileSpeed: 300,
    range: 150,
  },
  coconut: {
    name: "Coconut",
    icon: "proj-coconut",
    projSize: 14,
    projSheet: "proj-coconut",
    projAnim: "",
    fireRate: 1.5,
    damage: 25,
    projectileSpeed: 200,
    range: 180,
    splash: { radius: 60, damagePercent: 0.5 },
  },
  volleyball: {
    name: "Volleyball",
    icon: "proj-beachball",
    projSize: 14,
    projSheet: "proj-beachball",
    projAnim: "",
    fireRate: 0.7,
    damage: 10,
    projectileSpeed: 250,
    range: 160,
    bounce: 2,
  },
  bazooka: {
    name: "Bazooka",
    icon: "proj-bazooka",
    projSize: 20,
    projSheet: "water-blast-startup",
    projAnim: "water-blast-fly",
    beam: true,
    fireRate: 2.0,
    damage: 40,
    projectileSpeed: 180,
    range: 200,
    knockback: 30,
  },
};

export const DEFAULT_WEAPON = "watergun";
