import { pathFor, pathExtensions, extensionAt } from '../shared/game/paths';
import { mageAspect, mageMastered } from '../shared/game/magic';
import { magicColors } from '../shared/config/magic';
import { landmarkArt, watchtowerGroundY } from '../shared/config/presentation';
import { discoveries, rarityColors, terrainBonuses } from '../shared/config/drafting';
import type { TileId } from '../shared/config';
import { placementEffect } from '../shared/game/rules';
import { t } from './i18n';
import { factionArt, factions, type Faction } from '../shared/config/factions';
import { worldIslands } from '../shared/config/world';
import Phaser from 'phaser';
import { tileDef, towerDef, unitDef } from '../shared/config';
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
    {
      sprite: Phaser.GameObjects.Sprite;
      bar: Phaser.GameObjects.Graphics;
      burn?: { badge: Phaser.GameObjects.Container; count: Phaser.GameObjects.Text };
    }
  >();
  private landKey = '';
  private catapults = new Map<number, Phaser.GameObjects.Image>();

  private hover?: Point;
  private draftKind?: TileId;
  private previewLabel?: Phaser.GameObjects.Text;
  private knownTiles = new Set<string>();
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
      actor.burn?.badge.destroy();
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
    this.knownTiles.clear();
    this.previewLabel?.setVisible(false);
    this.draftKind = undefined;
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
  setDraft(kind?: string) {
    this.draftKind = kind as TileId | undefined;
    this.drawSelection();
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
  bounds() {
    const cells = [
      ...this.state.tiles,
      ...(this.state.phase === 'draft'
        ? pathExtensions(this.state).flatMap((option) => option.land)
        : []),
    ];
    const points = cells.map((p) => this.project(p));
    const left = Math.min(...points.map((p) => p.x)) - 80;
    const right = Math.max(...points.map((p) => p.x)) + 80;
    const top = Math.min(...points.map((p) => p.y)) - 125;
    const bottom = Math.max(...points.map((p) => p.y)) + 85;
    return {
      x: (left + right) / 2,
      y: (top + bottom) / 2,
      width: right - left,
      height: bottom - top,
    };
  }
  private drawLand() {
    this.catapults.clear();
    this.land.removeAll(true);
    const s = this.state;
    const list = [...s.tiles].sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x);
    for (const tile of list) {
      const { x, y } = this.project(tile),
        g = this.add.graphics(),
        path = onRoad(tile, s);
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
      if (!path && discoveries[tile.kind].rarity !== 'common') {
        g.lineStyle(2, rarityColors[discoveries[tile.kind].rarity], 0.9).strokeEllipse(
          x,
          y,
          60,
          28,
        );
      }
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
      const core = sameCell(tile, pathFor(s)[pathFor(s).length - 1]);
      const def = tileDef(tile.kind);
      const art = core
        ? 'keep'
        : building
          ? building.kind === 'sentinel'
            ? `mage-${mageAspect(building)}`
            : towerDef(building.kind).art
          : 'art' in def
            ? def.art
            : undefined;
      if (building?.kind === 'sentinel') {
        const color = magicColors[mageAspect(building)];
        g.lineStyle(2, color, 0.85).strokeEllipse(x, y + 3, 42, 20);
        if (mageMastered(building)) {
          g.lineStyle(2, color, 0.55).strokeEllipse(x, y + 3, 56, 28);
          for (const dx of [-24, 24]) {
            g.fillStyle(color).fillCircle(x + dx, y + 3, 3);
          }
        }
      }
      if (building && tile.kind === 'watchpost') {
        const platform = landmarkArt['tiles/watchpost'];
        this.land.add(
          this.add
            .image(x, y + 10, 'tiles/watchpost')
            .setOrigin(0.5, platform.groundY)
            .setDisplaySize(platform.width, platform.width),
        );
      }
      if (art) {
        const sprite = this.add
          .image(x, y + 10, factionArt(art, this.faction), 0)
          .setOrigin(0.5, 1);
        const width = core
          ? 92
          : art === 'catapult'
            ? 70
            : building
              ? 48
              : (landmarkArt[art]?.width ?? 58);
        if (landmarkArt[art]) {
          sprite.setOrigin(0.5, landmarkArt[art].groundY);
        }
        if (building?.kind === 'watchtower' || building?.kind === 'sentinel') {
          sprite.setOrigin(0.5, watchtowerGroundY);
        }
        if (building?.kind === 'catapult') {
          sprite.setOrigin(0.5, 0.78);
          this.catapults.set(building.id, sprite);
        }
        sprite.setDisplaySize(width, (width * sprite.height) / sprite.width);
        this.land.add(sprite);
      }
    }
    const entry = this.project(pathFor(s)[0]);
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
    this.previewLabel?.setVisible(false);
    if (this.state.phase === 'draft' && this.state.path) {
      const entry = this.project(pathFor(this.state)[0]);
      for (const option of pathExtensions(this.state)) {
        const end = this.project(option.entrance);
        const selected = !!this.hover && sameCell(this.hover, option.entrance);
        const color = selected ? 0xffdc85 : 0xe7dbb5;
        for (const cell of option.path) {
          const p = this.project(cell);
          this.polygon(
            g,
            [
              [p.x - 43, p.y],
              [p.x, p.y - 21],
              [p.x + 43, p.y],
              [p.x, p.y + 21],
            ],
            color,
            selected ? 0.5 : 0.16,
          );
        }
        g.lineStyle(selected ? 4 : 2, color, 0.9).lineBetween(entry.x, entry.y, end.x, end.y);
        const angle = Math.atan2(end.y - entry.y, end.x - entry.x);
        g.fillStyle(color, 1).fillTriangle(
          end.x,
          end.y,
          end.x - 18 * Math.cos(angle - 0.5),
          end.y - 18 * Math.sin(angle - 0.5),
          end.x - 18 * Math.cos(angle + 0.5),
          end.y - 18 * Math.sin(angle + 0.5),
        );
        g.lineStyle(3, color, 0.9).strokeEllipse(end.x, end.y, 76, 38);
      }
    }
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
    if (this.state.phase === 'draft' && this.draftKind && this.hover) {
      const cell = this.hover,
        p = this.project(cell);
      const valid = expansionCells(this.state).some((other) => sameCell(cell, other));
      const color = valid ? rarityColors[discoveries[this.draftKind].rarity] : 0xc57263;
      this.polygon(
        g,
        [
          [p.x - 44, p.y],
          [p.x, p.y - 22],
          [p.x + 44, p.y],
          [p.x, p.y + 22],
        ],
        color,
        0.65,
      );
      let lines = [t('draft.invalid')];
      if (valid) {
        const extension = extensionAt(this.state, cell);
        if (extension) {
          for (const land of extension.land) {
            const p = this.project(land);
            const road = extension.path.some((q) => sameCell(q, land));
            this.polygon(
              g,
              [
                [p.x - 43, p.y],
                [p.x, p.y - 21],
                [p.x + 43, p.y],
                [p.x, p.y + 21],
              ],
              road ? 0xc8b991 : sameCell(land, extension.discovery) ? color : 0xa6bb79,
              0.55,
            );
          }
        }
        const effect = placementEffect(this.state, this.draftKind, cell);
        lines = [
          ...(extension
            ? [
                t('draft.pathPreview', {
                  count: extension.path.length,
                  land: extension.land.length,
                }),
              ]
            : []),
          t('draft.preview', effect),
        ];
        if (effect.towers) {
          lines.push(t('draft.blessing', { count: effect.towers }));
        }
        if (effect.hastened) {
          lines.push(t('draft.haste', { count: effect.hastened }));
        }
        if (effect.range) {
          lines.push(t('draft.perch'));
        }
        if (effect.healing) {
          lines.push(t('draft.healing', { count: effect.healing }));
        }
        lines.push(t('draft.confirm'));
        for (const other of this.state.tiles) {
          const range =
            this.draftKind === 'shrine'
              ? terrainBonuses.shrineRadius
              : this.draftKind === 'windmill'
                ? terrainBonuses.windmillRadius
                : 1.01;
          const source = extension?.discovery ?? cell;
          if (Math.hypot(other.x - source.x, other.y - source.y) <= range) {
            const target = this.project(other);
            g.lineStyle(2, color, 0.8).lineBetween(p.x, p.y, target.x, target.y);
            g.strokeEllipse(target.x, target.y, 72, 36);
          }
        }
      }
      this.previewLabel ??= this.add
        .text(0, 0, '', {
          fontFamily: 'Fira',
          fontSize: '13px',
          color: '#fff7db',
          backgroundColor: '#243e39',
          padding: { x: 10, y: 8 },
          align: 'center',
        })
        .setOrigin(0.5, 1)
        .setDepth(1100);
      this.previewLabel
        .setText(lines.join('\n'))
        .setPosition(p.x, p.y - 38)
        .setVisible(true);
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
        range = effectiveStats(tower, this.state).range;
      g.lineStyle(2, 0xffecab, 0.7).strokeEllipse(p.x, p.y, range * 130, range * 65);
    }
  }
  render() {
    if (!this.land) {
      return;
    }
    const s = this.state,
      key = JSON.stringify([
        s.tiles,
        s.path,
        s.towers.map((t) => [t.id, t.x, t.y, t.kind, t.school, t.ranks]),
      ]);
    if (key !== this.landKey) {
      const added = this.landKey
        ? s.tiles.filter((tile) => !this.knownTiles.has(`${tile.x},${tile.y}`))
        : [];
      this.knownTiles = new Set(s.tiles.map((tile) => `${tile.x},${tile.y}`));
      this.landKey = key;
      this.drawLand();
      for (const tile of added) {
        const p = this.project(tile),
          color = rarityColors[discoveries[tile.kind].rarity];
        const ring = this.add.ellipse(p.x, p.y, 88, 44).setStrokeStyle(4, color).setDepth(1002);
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.tweens.add({
          targets: ring,
          scale: reduced ? 1 : 2.2,
          alpha: 0,
          duration: reduced ? 150 : 700,
          onComplete: () => ring.destroy(),
        });
      }
    }
    // Snapshot cooldown is authoritative: advancing frames never advances combat.
    for (const tower of s.towers) {
      const sprite = this.catapults.get(tower.id);
      if (!sprite) {
        continue;
      }
      const cooldown = effectiveStats(tower, this.state).cooldown;
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
          p = this.project(position(f.progress, this.state));
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
          position(
            Math.max(0, Math.min(pathFor(s).length - 1, f.progress + (ally ? -0.1 : 0.1))),
            s,
          ),
        );
        const opponents = ally ? s.enemies : s.recruits;
        const target = opponents.find(
          (unit) =>
            Math.hypot(
              position(unit.progress, this.state).x - position(f.progress, this.state).x,
              position(unit.progress, this.state).y - position(f.progress, this.state).y,
            ) <= def.range,
        );
        const facing = target ? this.project(position(target.progress, this.state)) : next;
        if (Math.abs(facing.x - p.x) > 0.01) {
          actor.sprite.setFlipX(facing.x < p.x);
        }
        actor.sprite.setPosition(p.x, p.y - 9).setDepth(500 + p.y / 10);
        actor.sprite.clearTint();
        if ((f.freeze ?? 0) > 0) {
          actor.sprite.setTint(0x92eaff);
          actor.sprite.anims.pause();
        } else {
          if (f.chill) {
            actor.sprite.setTint(0xc4efff);
          }
          if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
            actor.sprite.anims.resume();
          }
        }
        actor.bar
          .clear()
          .setDepth(600 + p.y / 10)
          .fillStyle(0x354b42)
          .fillRoundedRect(p.x - 16, p.y - 32, 32, 4, 2)
          .fillStyle(faction ? factions[faction].color : 0xe4a17f)
          .fillRect(p.x - 15, p.y - 31, 30 * Math.max(0, f.health / f.maxHealth), 2);
        if (f.chill || (f.freeze ?? 0) > 0) {
          actor.bar
            .lineStyle((f.freeze ?? 0) > 0 ? 3 : 1, magicColors.frost, 0.9)
            .strokeEllipse(p.x, p.y + 1, 28, 12);
          actor.bar
            .lineBetween(p.x + 20, p.y - 25, p.x + 20, p.y - 15)
            .lineBetween(p.x + 16, p.y - 20, p.x + 24, p.y - 20);
        }
        if (f.burn) {
          if (!actor.burn) {
            const backing = this.add
              .graphics()
              .fillStyle(0x35271f, 0.95)
              .fillRoundedRect(-20, -12, 40, 24, 6)
              .lineStyle(1, 0xd9964b, 0.9)
              .strokeRoundedRect(-20, -12, 40, 24, 6);
            const flame = this.add.image(-7, 0, 'magic/fire-icon').setDisplaySize(24, 24);
            const count = this.add
              .text(10, 0, '', {
                fontFamily: 'Fira',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#fff1cd',
                resolution: Math.max(2, window.devicePixelRatio),
              })
              .setOrigin(0.5);
            actor.burn = { badge: this.add.container(0, 0, [backing, flame, count]), count };
          }
          actor.burn.badge
            .setPosition(p.x, p.y - 49)
            .setDepth(700 + p.y / 10)
            .setVisible(true);
          actor.burn.count.setText(String(f.burn.stacks));
        } else {
          actor.burn?.badge.setVisible(false);
        }
      }
    }
    for (const [id, actor] of this.actors) {
      if (!live.has(id)) {
        actor.sprite.destroy();
        actor.bar.destroy();
        actor.burn?.badge.destroy();
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
          .setDisplaySize(
            projectile.magic
              ? projectile.magic.overcharge
                ? 32
                : 24
              : projectile.art === 'rock'
                ? 22
                : 42,
            projectile.magic
              ? projectile.magic.overcharge
                ? 32
                : 24
              : projectile.art === 'rock'
                ? 22
                : 42,
          )
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
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (impact.from) {
          const start = this.project(impact.from),
            dx = point.x - start.x,
            dy = point.y - start.y;
          const arc = this.add.graphics().setDepth(1002);
          arc.lineStyle(impact.capstone ? 4 : 2, magicColors.lightning, 0.95).strokePoints([
            { x: start.x, y: start.y - 12 },
            { x: start.x + dx * 0.35 - 4, y: start.y + dy * 0.35 - 16 },
            { x: start.x + dx * 0.65 + 4, y: start.y + dy * 0.65 - 8 },
            { x: point.x, y: point.y - 12 },
          ]);
          this.tweens.add({
            targets: arc,
            alpha: 0,
            duration: reduced ? 80 : 240,
            onComplete: () => arc.destroy(),
          });
        }
        const flash = this.add
          .circle(
            point.x,
            point.y - 10,
            impact.splash ? 12 : impact.capstone ? 10 : 5,
            impact.school ? magicColors[impact.school] : impact.ally ? 0xffe6a2 : 0xe4a086,
            0.8,
          )
          .setDepth(1001);
        this.tweens.add({
          targets: flash,
          scale: reduced ? 1 : impact.splash ? 2.3 : impact.capstone ? 2 : 1.5,
          alpha: 0,
          duration: 200,
          onComplete: () => flash.destroy(),
        });
      }
    }
    this.drawSelection();
  }
}
