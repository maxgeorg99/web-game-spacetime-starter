import * as Phaser from 'phaser';
import { HERO_CLASSES } from '../data/classes';
import { ENCOUNTER_TABLES, generateEncounter } from '../data/encounters';

// ── Map constants ────────────────────────────────────────────
const MAP_COLS = 40;
const MAP_ROWS = 30;
const TILE = 64;
const MAP_W = MAP_COLS * TILE;  // 2560
const MAP_H = MAP_ROWS * TILE;  // 1920
const BORDER = 3;               // water border thickness in tiles
const SPEED = 250;              // player px/s

interface PartyMember {
  classId: string;
  name: string;
  level: number;
  xp: number;
  currentHp: number;
  currentMp: number;
  stats: { hp: number; mp: number; atk: number; def: number; mag: number; spd: number };
}

export class OverworldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private music!: Phaser.Sound.BaseSound;
  private playerPrefix = '';

  // Encounter system
  private stepDistance = 0;
  private stepCount = 0;
  private encounterLocked = false;
  private readonly MIN_STEPS = 15;        // minimum tiles walked before encounter possible
  private readonly ENCOUNTER_RATE = 0.10; // 10% per tile after min
  private readonly STEP_SIZE = TILE;      // 1 tile = 1 step

  constructor() {
    super('OverworldScene');
  }

  create(): void {
    const walkable = this.buildMapData();

    // ── Water background (tiled) ─────────────────────────
    this.cameras.main.setBackgroundColor(0x4a9da8);
    const waterBg = this.add.tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, 'water_bg');
    waterBg.setDepth(0);

    // ── Tilemap: grass ground + collision ──────────────────
    const map = this.make.tilemap({
      width: MAP_COLS,
      height: MAP_ROWS,
      tileWidth: TILE,
      tileHeight: TILE,
    });

    // grass.png (512x512) sliced into 8x8 = 64 tiles of 64x64
    const tileset = map.addTilesetImage('grass', 'grass', TILE, TILE, 0, 0)!;

    // Visual ground layer — grass on walkable cells
    const ground = map.createBlankLayer('ground', tileset)!;
    ground.setDepth(2);

    // Invisible collision layer — tiles on water cells
    const collision = map.createBlankLayer('collision', tileset)!;
    collision.setVisible(false);

    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (walkable[r][c]) {
          ground.putTileAt(Phaser.Math.Between(0, 63), c, r);
        } else {
          collision.putTileAt(0, c, r);
        }
      }
    }
    collision.setCollisionByExclusion([-1]);

    // ── Coastline foam ────────────────────────────────────
    this.placeCoastFoam(walkable);

    // ── Environment decorations ───────────────────────────
    const obstacles = this.physics.add.staticGroup();
    this.placeDecorations(obstacles, walkable);

    // ── Player ────────────────────────────────────────────
    this.createPlayer();

    // ── Physics ───────────────────────────────────────────
    this.physics.add.collider(this.player, collision);
    this.physics.add.collider(this.player, obstacles);

    // ── Camera ────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.roundPixels = true;

    // ── Input ─────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();

    // ── Music ─────────────────────────────────────────────
    this.music = this.sound.add('music_main', { loop: true, volume: 0.5 });
    this.music.play();

    // ── Fade in ───────────────────────────────────────────
    this.cameras.main.fadeIn(500);

    // ── Resume from battle handler ────────────────────────
    this.events.on('resume', () => {
      this.encounterLocked = false;
      this.stepDistance = 0;
      this.stepCount = 0;
      this.cameras.main.setAlpha(1);
      this.cameras.main.fadeIn(400);
      // Restart overworld music
      if (!this.music.isPlaying) {
        this.music.play();
      }
    });
  }

  update(_time: number, _delta: number): void {
    if (!this.cursors || !this.player?.body) return;

    const { left, right, up, down } = this.cursors;
    let vx = 0;
    let vy = 0;

    if (left.isDown) vx -= 1;
    if (right.isDown) vx += 1;
    if (up.isDown) vy -= 1;
    if (down.isDown) vy += 1;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    this.player.setVelocity(vx * SPEED, vy * SPEED);

    // Rotate sprite toward movement direction
    if (vx < 0) {
      this.player.setFlipX(false);
      this.player.setRotation(0.15);
    } else if (vx > 0) {
      this.player.setFlipX(true);
      this.player.setRotation(-0.15);
    } else {
      this.player.setRotation(0);
    }

    const moving = vx !== 0 || vy !== 0;

    // Y-sort: player renders in front of objects lower on screen
    this.player.setDepth(this.player.y);

    // ── Encounter step tracking ──
    if (moving && !this.encounterLocked) {
      const speed = Math.sqrt(vx * vx + vy * vy) * SPEED;
      this.stepDistance += speed * (_delta / 1000);

      if (this.stepDistance >= this.STEP_SIZE) {
        const steps = Math.floor(this.stepDistance / this.STEP_SIZE);
        this.stepDistance -= steps * this.STEP_SIZE;
        this.stepCount += steps;

        // Check for encounter after minimum steps
        if (this.stepCount >= this.MIN_STEPS) {
          for (let s = 0; s < steps; s++) {
            if (Math.random() < this.ENCOUNTER_RATE) {
              this.triggerEncounter();
              return;
            }
          }
        }
      }
    }
  }

  // ────────────────────────────────────────────────────────
  // Encounter trigger
  // ────────────────────────────────────────────────────────
  private triggerEncounter(): void {
    this.encounterLocked = true;
    this.player.setVelocity(0, 0);

    const table = ENCOUNTER_TABLES['forest'];
    const enemies = generateEncounter(table);

    // Flash transition effect
    const cam = this.cameras.main;
    let flashes = 0;
    const flashTimer = this.time.addEvent({
      delay: 120,
      repeat: 5,
      callback: () => {
        flashes++;
        if (flashes % 2 === 1) cam.setAlpha(0.1);
        else cam.setAlpha(1);
      },
    });

    this.time.delayedCall(720, () => {
      cam.setAlpha(1);
      this.music.stop();
      cam.fadeOut(300, 0, 0, 0);
      cam.once('camerafadeoutcomplete', () => {
        this.scene.pause('OverworldScene');
        this.scene.launch('BattleScene', { enemies });
      });
    });
  }

  // ────────────────────────────────────────────────────────
  // Map generation
  // ────────────────────────────────────────────────────────
  private buildMapData(): boolean[][] {
    const map: boolean[][] = [];
    for (let r = 0; r < MAP_ROWS; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < MAP_COLS; c++) {
        const water =
          r < BORDER || r >= MAP_ROWS - BORDER ||
          c < BORDER || c >= MAP_COLS - BORDER;
        row.push(!water);
      }
      map.push(row);
    }

    // Pond (center-right area)
    this.carveOval(map, 28, 14, 4, 3);

    // Small lake (lower-left)
    this.carveOval(map, 9, 22, 3, 2);

    return map;
  }

  private carveOval(
    map: boolean[][],
    cx: number, cy: number,
    rx: number, ry: number,
  ): void {
    for (let r = cy - ry; r <= cy + ry; r++) {
      for (let c = cx - rx; c <= cx + rx; c++) {
        if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
          const dx = (c - cx) / rx;
          const dy = (r - cy) / ry;
          if (dx * dx + dy * dy <= 1) {
            map[r][c] = false;
          }
        }
      }
    }
  }

  // ────────────────────────────────────────────────────────
  // Player setup
  // ────────────────────────────────────────────────────────
  private createPlayer(): void {
    const party = this.registry.get('party') as PartyMember[];
    const leader = party[0];
    const cls = HERO_CLASSES.find(c => c.id === leader.classId)!;
    this.playerPrefix = cls.battleSpritePrefix;

    // Use the class portrait sprite (same one shown in party select)
    const portraitKey = cls.portraitKey; // e.g. 'class_fighter'

    // Spawn near top-left of walkable area
    const spawnX = (BORDER + 3) * TILE + TILE / 2;
    const spawnY = (BORDER + 3) * TILE + TILE / 2;

    this.player = this.physics.add.sprite(spawnX, spawnY, portraitKey);

    // Portrait images are ~96x110 — scale to ~80px tall
    const tex = this.textures.get(portraitKey).getSourceImage();
    const scale = 80 / tex.height;
    this.player.setScale(scale);
    this.player.setDepth(10000);

    // Physics body around lower half (feet area)
    const fw = tex.width;
    const fh = tex.height;
    this.player.body!.setSize(fw * 0.5, fh * 0.25);
    this.player.body!.setOffset(fw * 0.25, fh * 0.7);
  }

  // ────────────────────────────────────────────────────────
  // Coastline foam
  // ────────────────────────────────────────────────────────
  private placeCoastFoam(walkable: boolean[][]): void {
    if (!this.textures.exists('water_foam')) return;

    // Register foam animation
    const totalFrames = this.textures.get('water_foam').frameTotal - 1;
    if (!this.anims.exists('foam_anim')) {
      this.anims.create({
        key: 'foam_anim',
        frames: this.anims.generateFrameNumbers('water_foam', { start: 0, end: totalFrames - 1 }),
        frameRate: 5,
        repeat: -1,
      });
    }

    // Place foam on every GRASS tile that borders water.
    // Foam is 192px (3 tiles wide) — dense placement creates smooth overlapping coastline.
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (!walkable[r][c]) continue;

        const bordersWater =
          (r > 0 && !walkable[r - 1][c]) ||
          (r < MAP_ROWS - 1 && !walkable[r + 1][c]) ||
          (c > 0 && !walkable[r][c - 1]) ||
          (c < MAP_COLS - 1 && !walkable[r][c + 1]);

        if (!bordersWater) continue;

        const x = c * TILE + TILE / 2;
        const y = r * TILE + TILE / 2;

        const foam = this.add.sprite(x, y, 'water_foam', 0);
        foam.setScale(1);
        foam.setDepth(1.5);
        foam.setAlpha(0.75);

        // Sync animation frame based on position for smooth wave effect along edges
        const waveOffset = (r + c) % totalFrames;
        foam.anims.play({ key: 'foam_anim', startFrame: waveOffset });
      }
    }
  }

  // ────────────────────────────────────────────────────────
  // Decorations
  // ────────────────────────────────────────────────────────
  private placeDecorations(
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    walkable: boolean[][],
  ): void {
    // ── Trees ──
    const treeSpots: [number, number, number][] = [
      // [col, row, treeType 1-3]
      [6,  5,  1], [9,  4,  2], [16, 5,  3], [21, 4,  1],
      [33, 5,  2], [36, 6,  1], [6,  15, 3], [8,  17, 2],
      [18, 9,  1], [22, 21, 3], [34, 15, 1], [36, 20, 2],
      [12, 24, 3], [26, 24, 1], [15, 7,  2], [31, 10, 3],
      [13, 19, 1], [30, 22, 2],
    ];

    for (const [col, row, type] of treeSpots) {
      // Skip if on water
      if (!walkable[row]?.[col]) continue;

      const key = `tree${type}`;
      if (!this.textures.exists(key)) continue;

      const x = col * TILE + TILE / 2;
      const y = row * TILE;

      const tree = this.add.sprite(x, y, key, 0).setScale(0.5);
      tree.setDepth(y + 200); // trees render above player when below

      // Idle sway animation
      const animKey = `tree${type}_sway`;
      if (!this.anims.exists(animKey)) {
        const total = this.textures.get(key).frameTotal - 1;
        if (total > 1) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(key, { start: 0, end: total - 1 }),
            frameRate: 3,
            repeat: -1,
            yoyo: true,
          });
        }
      }
      if (this.anims.exists(animKey)) {
        tree.anims.play({ key: animKey, startFrame: Phaser.Math.Between(0, 3) });
      }

      // Separate collision zone at tree trunk (bottom center of displayed sprite)
      const trunkY = y + tree.displayHeight / 2 - 10;
      const zone = this.add.zone(x, trunkY, 50, 30);
      this.physics.add.existing(zone, true);
      obstacles.add(zone);
    }

    // ── Rocks ──
    const rockSpots: [number, number, number][] = [
      [13, 7,  1], [23, 8,  2], [31, 13, 3], [7,  22, 4],
      [15, 20, 1], [33, 23, 2], [25, 7,  3], [11, 11, 4],
      [19, 16, 1], [35, 10, 2],
    ];

    for (const [col, row, type] of rockSpots) {
      if (!walkable[row]?.[col]) continue;

      const key = `rock${type}`;
      if (!this.textures.exists(key)) continue;

      const x = col * TILE + TILE / 2;
      const y = row * TILE + TILE / 2;

      const rock = this.add.image(x, y, key).setDepth(y);
      this.physics.add.existing(rock, true);
      obstacles.add(rock);
    }
  }
}
