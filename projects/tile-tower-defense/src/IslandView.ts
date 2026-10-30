import { t } from './i18n';
import { factionArt, factions, type Faction } from '../shared/config/factions';
import { worldIslands } from '../shared/config/world';
import Phaser from 'phaser';
import { road, tileDef, towerDef, unitDef } from '../shared/config';
import { effectiveStats, expansionCells, onRoad, position, sameCell } from '../shared/game/rules';
import type { Point } from '../shared/game/model';
import type { State } from '../shared/game/model';

export class IslandView {
  selected?: Point;

  private land!: Phaser.GameObjects.Container;
  private projectiles = new Map<number, Phaser.GameObjects.Image>();
  private highlight!: Phaser.GameObjects.Graphics;
  private actors = new Map<
    number,
    { sprite: Phaser.GameObjects.Sprite; bar: Phaser.GameObjects.Graphics }
  >();
  private landKey = '';
  private catapults = new Map<number, Phaser.GameObjects.Image>();

  private hover?: Point;
  private lastImpacts: unknown;
  constructor(
    private scene: Phaser.Scene,
    public state: State,
    private origin: Point,
    private faction: Faction,
  ) {
    this.land = this.add.container(0, 0);
    this.highlight = this.add.graphics().setDepth(999);
  }
  reset() {
    for (const actor of this.actors.values()) {
      actor.sprite.destroy();
      actor.bar.destroy();
    }
    this.actors.clear();
    for (const sprite of this.projectiles.values()) {
      this.tweens.killTweensOf(sprite);
      sprite.destroy();
    }
    this.projectiles.clear();
    this.catapults.clear();
    this.land.removeAll(true);
    this.landKey = '';
    this.lastImpacts = undefined;
    this.selected = undefined;
    this.hover = undefined;
    this.highlight.clear();
  }
  private get add() {
    return this.scene.add;
  }
  private get tweens() {
    return this.scene.tweens;
  }
  setHover(point?: Point) {
    this.hover = point;
    this.drawSelection();
  }
  select(point: Point) {
    this.selected = point;
    this.drawSelection();
  }
  project(p: Point) {
    return { x: this.origin.x + 500 + (p.x - p.y) * 46, y: this.origin.y + 302 + (p.x + p.y) * 23 };
  }
  unproject(x: number, y: number): Point {
    return {
      x: Math.round((x - this.origin.x - 500) / 92 + (y - this.origin.y - 302) / 46),
      y: Math.round((y - this.origin.y - 302) / 46 - (x - this.origin.x - 500) / 92),
    };
  }
  clearSelection() {
    this.selected = undefined;
    this.drawSelection();
  }
  private polygon(g: Phaser.GameObjects.Graphics, points: number[][], color: number, alpha = 1) {
    g.fillStyle(color, alpha).fillPoints(
      points.map(([x, y]) => new Phaser.Geom.Point(x, y)),
      true,
    );
  }
  private drawLand() {
    this.catapults.clear();
    this.land.removeAll(true);
    const s = this.state;
    const list = [...s.tiles].sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x);
    for (const tile of list) {
      const { x, y } = this.project(tile),
        g = this.add.graphics(),
        path = onRoad(tile);
      this.polygon(
        g,
        [
          [x - 45, y],
          [x, y + 23],
          [x, y + 59],
          [x - 45, y + 34],
        ],
        0x82765a,
      );
      this.polygon(
        g,
        [
          [x, y + 23],
          [x + 45, y],
          [x + 45, y + 34],
          [x, y + 59],
        ],
        0x5e6652,
      );
      this.polygon(
        g,
        [
          [x - 45, y],
          [x, y - 23],
          [x + 45, y],
          [x, y + 23],
        ],
        path ? 0xc8b991 : tileDef(tile.kind).color,
      );
      g.lineStyle(1, 0xc9d59a, 0.7).strokePoints(
        [
          { x: x - 45, y },
          { x, y: y - 23 },
          { x: x + 45, y },
          { x, y: y + 23 },
        ],
        true,
      );
      if (path) {
        for (const [dx, dy] of [
          [-14, 0],
          [9, -4],
          [3, 9],
        ]) {
          this.polygon(
            g,
            [
              [x + dx - 6, y + dy],
              [x + dx, y + dy - 3],
              [x + dx + 6, y + dy],
              [x + dx, y + dy + 3],
            ],
            0xb2a17c,
          );
        }
      } else if (tile.kind === 'meadow') {
        g.lineStyle(2, 0x809858);
        for (const dx of [-22, 20]) {
          g.lineBetween(x + dx, y + 3, x + dx - 3, y - 2);
        }
      }
      this.land.add(g);
      const building = s.towers.find((t) => sameCell(t, tile));
      const core = sameCell(tile, road[road.length - 1]);
      const def = tileDef(tile.kind);
      const art = core
        ? 'keep'
        : building
          ? towerDef(building.kind).art
          : 'art' in def
            ? def.art
            : undefined;
      if (art) {
        const sprite = this.add
          .image(x, y + 10, factionArt(art, this.faction), 0)
          .setOrigin(0.5, 1);
        const width = core
          ? 92
          : art === 'catapult'
            ? 70
            : art === 'forest'
              ? 95
              : building
                ? 48
                : 58;
        if (building?.kind === 'catapult') {
          sprite.setOrigin(0.5, 0.78);
          this.catapults.set(building.id, sprite);
        }
        sprite.setDisplaySize(width, (width * sprite.height) / sprite.width);
        this.land.add(sprite);
      }
    }
    const entry = this.project(road[0]);
    this.land.add(
      this.add
        .text(entry.x, entry.y - 36, t('island.incoming'), {
          fontFamily: 'Fira',
          resolution: Math.max(2, window.devicePixelRatio * 2),
          fontSize: '12px',
          color: '#704f43',
          backgroundColor: '#e9ddbe',
          padding: { x: 6, y: 4 },
        })
        .setOrigin(0.5),
    );
  }
  private drawSelection() {
    if (!this.highlight) {
      return;
    }
    const g = this.highlight;
    g.clear();
    if (this.state.phase === 'draft') {
      for (const cell of expansionCells(this.state)) {
        const p = this.project(cell);
        g.lineStyle(1, 0xf7ebc0, 0.8).strokePoints(
          [
            { x: p.x - 44, y: p.y },
            { x: p.x, y: p.y - 22 },
            { x: p.x + 44, y: p.y },
            { x: p.x, y: p.y + 22 },
          ],
          true,
        );
      }
    }
    for (const [cell, color] of [
      [this.hover, 0xffffff],
      [this.selected, 0xffdc85],
    ] as const) {
      if (cell) {
        if (
          !this.state.tiles.some((t) => sameCell(t, cell)) &&
          !expansionCells(this.state).some((t) => sameCell(t, cell))
        ) {
          continue;
        }
        const p = this.project(cell);
        g.lineStyle(3, color, 0.9).strokePoints(
          [
            { x: p.x - 44, y: p.y },
            { x: p.x, y: p.y - 22 },
            { x: p.x + 44, y: p.y },
            { x: p.x, y: p.y + 22 },
          ],
          true,
        );
      }
    }
    const tower = this.state.towers.find((t) => this.selected && sameCell(t, this.selected));
    if (tower) {
      const p = this.project(tower),
        range = effectiveStats(tower).range;
      g.lineStyle(2, 0xffecab, 0.7).strokeEllipse(p.x, p.y, range * 130, range * 65);
    }
  }
  render() {
    if (!this.land) {
      return;
    }
    const s = this.state,
      key = JSON.stringify([s.tiles, s.towers.map((t) => [t.id, t.x, t.y, t.kind])]);
    if (key !== this.landKey) {
      this.landKey = key;
      this.drawLand();
    }
    // Snapshot cooldown is authoritative: advancing frames never advances combat.
    for (const tower of s.towers) {
      const sprite = this.catapults.get(tower.id);
      if (!sprite) {
        continue;
      }
      const cooldown = effectiveStats(tower).cooldown;
      const duration = Math.min(1.1, cooldown);
      const elapsed = Math.max(0, cooldown - tower.cooldown);
      if (
        tower.cooldown > 0 &&
        elapsed < duration &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        const frame = Math.min(12, Math.floor((elapsed / duration) * 13));
        sprite.setTexture(
          factionArt(frame < 9 ? 'catapult-fire' : 'catapult-load', this.faction),
          frame < 9 ? frame : frame - 9,
        );
      } else {
        sprite.setTexture(factionArt('catapult', this.faction));
      }
    }
    const live = new Set<number>();
    for (const [fighters, ally] of [
      [s.enemies, false],
      [s.recruits, true],
    ] as const) {
      for (const f of fighters) {
        live.add(f.id);
        const def = unitDef(f.kind),
          p = this.project(position(f.progress));
        const faction = ally
          ? this.faction
          : f.captainSlot !== undefined
            ? worldIslands[f.captainSlot]?.faction
            : undefined;
        const art = faction ? factionArt(def.art, faction) : def.art;
        let actor = this.actors.get(f.id);
        if (!actor) {
          const sprite = this.add
            .sprite(p.x, p.y - 9, art)
            .setDisplaySize(ally ? 90 : 88, ally ? 90 : 88)
            .setFlipX(ally);
          if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
            sprite.play(art);
          }
          actor = { sprite, bar: this.add.graphics() };
          this.actors.set(f.id, actor);
        }
        const next = this.project(
          position(Math.max(0, Math.min(road.length - 1, f.progress + (ally ? -0.1 : 0.1)))),
        );
        const opponents = ally ? s.enemies : s.recruits;
        const target = opponents.find(
          (unit) =>
            Math.hypot(
              position(unit.progress).x - position(f.progress).x,
              position(unit.progress).y - position(f.progress).y,
            ) <= def.range,
        );
        const facing = target ? this.project(position(target.progress)) : next;
        if (Math.abs(facing.x - p.x) > 0.01) {
          actor.sprite.setFlipX(facing.x < p.x);
        }
        actor.sprite.setPosition(p.x, p.y - 9).setDepth(500 + p.y / 10);
        actor.bar
          .clear()
          .setDepth(600 + p.y / 10)
          .fillStyle(0x354b42)
          .fillRoundedRect(p.x - 16, p.y - 32, 32, 4, 2)
          .fillStyle(faction ? factions[faction].color : 0xe4a17f)
          .fillRect(p.x - 15, p.y - 31, 30 * Math.max(0, f.health / f.maxHealth), 2);
      }
    }
    for (const [id, actor] of this.actors) {
      if (!live.has(id)) {
        actor.sprite.destroy();
        actor.bar.destroy();
        this.actors.delete(id);
      }
    }
    const flying = new Set<number>();
    for (const projectile of s.projectiles) {
      flying.add(projectile.id);
      const point = this.project(projectile);
      const target = this.project(projectile.aim);
      const height = 12 + (projectile.launchHeight - 12) * Math.max(0, 1 - projectile.age * 2);
      const x = point.x,
        y = point.y - height;
      let sprite = this.projectiles.get(projectile.id);
      if (!sprite) {
        sprite = this.add
          .image(x, y, projectile.art)
          .setDisplaySize(projectile.art === 'rock' ? 22 : 42, projectile.art === 'rock' ? 22 : 42)
          .setDepth(1000);
        this.projectiles.set(projectile.id, sprite);
      }
      this.tweens.killTweensOf(sprite);
      this.tweens.add({ targets: sprite, x, y, duration: 100, ease: 'Linear' });
      sprite.setRotation(
        projectile.art === 'rock'
          ? projectile.age * 10
          : Math.atan2(target.y - 12 - y, target.x - x),
      );
    }
    for (const [id, sprite] of this.projectiles) {
      if (!flying.has(id)) {
        this.tweens.killTweensOf(sprite);
        sprite.destroy();
        this.projectiles.delete(id);
      }
    }
    if (s.impacts !== this.lastImpacts) {
      this.lastImpacts = s.impacts;
      for (const impact of s.impacts) {
        const point = this.project(impact);
        const flash = this.add
          .circle(
            point.x,
            point.y - 10,
            impact.splash ? 12 : 5,
            impact.ally ? 0xffe6a2 : 0xe4a086,
            0.8,
          )
          .setDepth(1001);
        this.tweens.add({
          targets: flash,
          scale: impact.splash ? 2.3 : 1.5,
          alpha: 0,
          duration: 200,
          onComplete: () => flash.destroy(),
        });
      }
    }
    this.drawSelection();
  }
}
