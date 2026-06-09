import { SAND_FRAME, COAST_NW, COAST_N, COAST_NE, COAST_W, COAST_E, COAST_SW, COAST_S, COAST_SE } from "../config/constants";

export const A = {
  // Tile sheet
  TILES_SHEET: "tiles-sheet",
  OCEAN: "ocean",

  // Tower
  TOWER_BASE: "sandtower",

  // Walls
  WALL_H: "wall-h",
  WALL_V: "wall-v",

  // Connected tower variants
  TOWER_WALL_UP_LEFT: "sandtower-wall-up-left",
  TOWER_WALL_UP_RIGHT: "sandtower-wall-up-right",
  TOWER_WALL_DOWN_LEFT: "sandtower-wall-down-left",
  TOWER_WALL_DOWN_RIGHT: "sandtower-wall-down-right",
  TOWER_WALL_DOWN_UP: "sandtower-wall-down-up",
  TOWER_WALL_LEFT_RIGHT: "sandtower-wall-left-right",
  TOWER_WALL_UP: "sandtower-wall-up",
  TOWER_WALL_DOWN: "sandtower-wall-down",
  TOWER_WALL_LEFT: "sandtower-wall-left",
  TOWER_WALL_RIGHT: "sandtower-wall-right",

  // Palm
  PALM: "palm",

  // Shells
  SHELL_BLACK: "shell-black",
  SHELL_GREEN: "shell-green",
  SHELL_BROWN: "shell-brown",
  SHELL_RED: "shell-red",
  SHELL_PINK: "shell-pink",
  SHELL_YELLOW: "shell-yellow",

  // Projectiles
  PROJ_WATERGUN: "proj-watergun",
  PROJ_COCONUT: "proj-coconut",
  PROJ_BEACHBALL: "proj-beachball",
  PROJ_BAZOOKA: "proj-bazooka",
  WATER_BALL_STARTUP: "water-ball-startup",
  WATER_BLAST_STARTUP: "water-blast-startup",

  // Enemy spritesheets
  ENEMY_PADDLEFISH_RUN: "enemy-paddlefish-run",
  ENEMY_PADDLEFISH_ATTACK: "enemy-paddlefish-attack",
  ENEMY_HARPOONFISH_RUN: "enemy-harpoonfish-run",
  ENEMY_HARPOONFISH_ATTACK: "enemy-harpoonfish-attack",
  ENEMY_TURTLE_WALK: "enemy-turtle-walk",
  ENEMY_TURTLE_ATTACK: "enemy-turtle-attack",
  ENEMY_SNAKE_RUN: "enemy-snake-run",
  ENEMY_SNAKE_ATTACK: "enemy-snake-attack",

  // Enemy avatars
  PADDLEFISH_AVATAR: "paddlefish-avatar",
  HARPOONFISH_AVATAR: "harpoonfish-avatar",
  TURTLE_AVATAR: "turtle-avatar",
  SNAKE_AVATAR: "snake-avatar",

  // Animations
  ANIM_WATER_BALL_FLY: "water-ball-fly",
  ANIM_WATER_BLAST_FLY: "water-blast-fly",

  // UI
  UI_START: "ui-start",
  UI_VICTORY: "ui-victory",
  UI_DEFEAT: "ui-defeat",
  UI_BTN_RED: "ui-btn-red",
  UI_HUD: "ui-hud",
  UI_SIGN: "ui-sign",
  UI_PHONE: "ui-phone",
  ICON_GOLD: "icon-gold",

  // Portrait
  PORTRAIT_LIFEGUARD: "portrait-lifeguard",

  // Misc
  SANDWICH: "sandwich",
} as const;

export type AssetKey = (typeof A)[keyof typeof A];

export { SAND_FRAME, COAST_NW, COAST_N, COAST_NE, COAST_W, COAST_E, COAST_SW, COAST_S, COAST_SE };
