import { assetUrl } from './assets';
import Phaser from 'phaser';
import type { Point } from '../shared/game/model';
import { fresh, expansionCells, sameCell } from '../shared/game/rules';
import { worldBalance, worldIslands } from '../shared/config/world';
import type { GameStore } from './store';
import { images, sheets } from './art';
import { IslandView } from './IslandView';

/** One camera and one scene, with four independent snapshot renderers. */
export class IslandScene extends Phaser.Scene {
  onSelect: (point: Point) => void = () => {};
  onInspect: (slot: number) => void = () => {};
  private views: IslandView[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private airships = new Map<number, Phaser.GameObjects.Container>();
  private unsubscribe?: () => void;
  private dragStart?: { x: number; y: number; scrollX: number; scrollY: number };
  private dragged = false;
  private touchPositions = new Map<number, Point>();
  private pinch?: { distance: number; zoom: number; anchor: Point };
  private focused = false;
  private database?: string;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  constructor(private store: GameStore) {
    super('Island');
  }
  preload() {
    for (const key of images) {
      this.load.image(key, `${assetUrl(`art/${key}.png`)}`);
    }
    for (const [key, sheet] of Object.entries(sheets)) {
      this.load.spritesheet(key, `${assetUrl(`art/${key}.png`)}`, {
        frameWidth: sheet.size,
        frameHeight: sheet.size,
      });
    }
  }
  create() {
    for (const key of [...images, ...Object.keys(sheets)]) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    for (const [key, sheet] of Object.entries(sheets)) {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: sheet.frames - 1 }),
        frameRate: 7,
        repeat: -1,
      });
    }
    this.add
      .graphics()
      .fillGradientStyle(0xdce1df, 0xdce1df, 0xaac3c9, 0xaac3c9)
      .fillRect(-5000, -5000, 10000, 10000);
    const islands = this.store.online
      ? worldIslands
      : [{ slot: 0, name: 'Your keep', x: 0, y: 0, color: 0x6e9cbe }];
    for (const island of islands) {
      this.add.ellipse(island.x + 500, island.y + 465, 390, 62, 0x647f80, 0.12);
      const view = new IslandView(
        this,
        fresh(),
        island,
        this.store.online ? worldIslands[island.slot].faction : 'blue',
      );
      this.views.push(view);
      this.labels.push(
        this.add
          .text(island.x + 500, island.y + 110, island.name, {
            fontFamily: 'Fira',
            fontSize: '20px',
            resolution: 3,
            color: '#465d57',
            backgroundColor: '#f9f7e9',
            padding: { x: 12, y: 6 },
          })
          .setOrigin(0.5),
      );
    }
    this.input.addPointer(1);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.store.ready) {
        return;
      }
      this.touchPositions.set(pointer.id, { x: pointer.x, y: pointer.y });
      if (this.touchPositions.size === 2) {
        const [a, b] = [...this.touchPositions.values()];
        this.pinch = {
          distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          zoom: this.cameras.main.zoom,
          anchor: this.cameras.main.getWorldPoint((a.x + b.x) / 2, (a.y + b.y) / 2),
        };
        this.dragged = true;
        return;
      }
      this.dragStart = {
        x: pointer.x,
        y: pointer.y,
        scrollX: this.cameras.main.scrollX,
        scrollY: this.cameras.main.scrollY,
      };
      this.dragged = false;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.touchPositions.has(pointer.id)) {
        this.touchPositions.set(pointer.id, { x: pointer.x, y: pointer.y });
      }
      if (this.pinch && this.touchPositions.size === 2) {
        const [a, b] = [...this.touchPositions.values()];
        const camera = this.cameras.main;
        camera.setZoom(
          Phaser.Math.Clamp(
            (this.pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / this.pinch.distance,
            0.18,
            2.2,
          ),
        );
        const current = camera.getWorldPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
        camera.setScroll(
          camera.scrollX + this.pinch.anchor.x - current.x,
          camera.scrollY + this.pinch.anchor.y - current.y,
        );
        return;
      }
      if (pointer.isDown && this.dragStart) {
        const dx = pointer.x - this.dragStart.x,
          dy = pointer.y - this.dragStart.y;
        if (Math.hypot(dx, dy) > 5) {
          this.dragged = true;
        }
        if (this.dragged) {
          this.cameras.main.setScroll(
            this.dragStart.scrollX - dx / this.cameras.main.zoom,
            this.dragStart.scrollY - dy / this.cameras.main.zoom,
          );
          return;
        }
      }
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.ownView?.setHover(this.ownView.unproject(point.x, point.y));
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.touchPositions.delete(pointer.id);
      this.pinch = undefined;
      if (!this.store.ready) {
        return;
      }
      this.dragStart = undefined;
      if (this.dragged) {
        return;
      }
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      for (let slot = 0; slot < this.views.length; slot++) {
        const view = this.views[slot],
          cell = view.unproject(point.x, point.y);
        if (
          view.state.tiles.some((tile) => sameCell(tile, cell)) ||
          expansionCells(view.state).some((tile) => sameCell(tile, cell))
        ) {
          if (view === this.ownView) {
            view.select(cell);
            this.onSelect(cell);
          } else {
            this.onInspect(slot);
          }
          return;
        }
      }
    });
    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
      this.touchPositions.delete(pointer.id);
      this.pinch = undefined;
      this.dragStart = undefined;
      this.dragged = true;
    });
    this.input.on(
      'wheel',
      (_pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
        this.cameras.main.setZoom(
          Phaser.Math.Clamp(this.cameras.main.zoom * Math.exp(-dy * 0.001), 0.18, 2.2),
        );
      },
    );
    this.scale.on('resize', this.resize, this);
    this.unsubscribe = this.store.subscribe(() => this.render());
    this.events.once('shutdown', () => {
      this.unsubscribe?.();
      this.scale.off('resize', this.resize, this);
    });
    this.render();
  }
  /** Quiet distant battles while the camera visits another island. */
  soundGain(slot: number, point: Point): number {
    const view = this.views[slot];
    const camera = this.cameras?.main;
    if (!view || !camera) {
      return 0;
    }
    const position = view.project(point);
    const bounds = camera.worldView;
    if (!bounds.contains(position.x, position.y)) {
      return 0;
    }
    const distance = Math.hypot(position.x - bounds.centerX, position.y - bounds.centerY);
    return Math.max(0.15, 1 - distance / Math.max(bounds.width, bounds.height));
  }
  private get ownView() {
    return this.views[this.store.online ? (this.store.ownSlot ?? -1) : 0];
  }
  clearSelection() {
    this.ownView?.clearSelection();
  }
  focusIsland(slot: number) {
    const island = this.store.online ? worldIslands[slot] : { x: 0, y: 0 };
    if (!island || !this.cameras.main) {
      return;
    }
    this.cameras.main
      .setZoom(
        Math.max(
          0.4,
          Math.min(1.4, (this.scale.width - 38) / 600, (this.scale.height - 290) / 380),
        ),
      )
      .centerOn(island.x + 500, island.y + 330);
  }
  overview() {
    if (!this.cameras.main) {
      return;
    }
    if (!this.store.online) {
      this.focusIsland(0);
      return;
    }
    this.cameras.main
      .setZoom(
        Math.max(0.15, Math.min((this.scale.width - 80) / 2600, (this.scale.height - 260) / 1850)),
      )
      .centerOn(500, 330);
  }
  private resize() {
    if (this.store.ready && this.store.ownSlot !== null) {
      this.focusIsland(this.store.ownSlot);
    } else {
      this.overview();
    }
  }
  private render() {
    if (!this.views.length) {
      return;
    }
    if (this.database !== this.store.destination?.database) {
      this.database = this.store.destination?.database;
      this.focused = false;
      this.touchPositions.clear();
      this.pinch = undefined;
      this.dragStart = undefined;
      for (const view of this.views) {
        view.reset();
      }
      for (const ship of this.airships.values()) {
        this.tweens.killTweensOf(ship);
        ship.destroy(true);
      }
      this.airships.clear();
    }
    for (let slot = 0; slot < this.views.length; slot++) {
      const seat = this.store.world?.seats[slot];
      this.views[slot].state = this.store.online ? (seat?.state ?? fresh()) : this.store.state;
      this.views[slot].render();
      if (this.store.online) {
        this.labels[slot].setText(
          `${worldIslands[slot].name}${seat?.owner ? (slot === this.store.ownSlot ? ' · You' : ' · ' + (seat.name ?? 'Captain ' + seat.owner.slice(-4))) : ' · Unclaimed'}`,
        );
      }
    }
    if (!this.focused && (!this.store.online || this.store.world)) {
      this.focused = true;
      if (this.store.ownSlot !== null || !this.store.online) {
        this.focusIsland(this.store.ownSlot ?? 0);
      } else {
        this.overview();
      }
    }
    this.renderFlights();
  }
  private renderFlights() {
    const alive = new Set<number>();
    for (const flight of this.store.world?.flights ?? []) {
      alive.add(flight.id);
      const from = worldIslands[flight.from],
        to = worldIslands[flight.to];
      const progress = Math.min(1, flight.elapsed / worldBalance.flightSeconds);
      const x = Phaser.Math.Linear(from.x + 500, to.x + 500, progress);
      const y =
        Phaser.Math.Linear(from.y + 330, to.y + 210, progress) - Math.sin(progress * Math.PI) * 150;
      let ship = this.airships.get(flight.id);
      if (!ship) {
        const art = this.add.graphics();
        art.lineStyle(2, 0x89785a).lineBetween(-24, 0, -14, 28).lineBetween(24, 0, 14, 28);
        art.fillStyle(0x8d6745).fillRoundedRect(-18, 22, 36, 13, 4);
        art.fillStyle(0xe9d19b).fillEllipse(0, 0, 90, 40);
        art.fillStyle(from.color).fillEllipse(0, 0, 24, 40);
        const label = this.add
          .text(0, 42, `${flight.count} troops`, {
            fontFamily: 'Fira',
            fontSize: '12px',
            resolution: 3,
            color: '#445951',
            backgroundColor: '#f8f3de',
            padding: { x: 4, y: 2 },
          })
          .setOrigin(0.5);
        ship = this.add.container(x, y, [art, label]).setDepth(1500);
        this.airships.set(flight.id, ship);
      }
      this.tweens.killTweensOf(ship);
      this.tweens.add({ targets: ship, x, y, duration: 100, ease: 'Linear' });
    }
    for (const [id, ship] of this.airships) {
      if (!alive.has(id)) {
        this.tweens.killTweensOf(ship);
        ship.destroy(true);
        this.airships.delete(id);
      }
    }
  }
  update(_time: number, delta: number) {
    if (
      !this.store.ready ||
      !this.cursors ||
      ['INPUT', 'SELECT'].includes(document.activeElement?.tagName ?? '')
    ) {
      return;
    }
    const speed = (delta * 0.8) / this.cameras.main.zoom;
    if (this.cursors.left.isDown) {
      this.cameras.main.scrollX -= speed;
    }
    if (this.cursors.right.isDown) {
      this.cameras.main.scrollX += speed;
    }
    if (this.cursors.up.isDown) {
      this.cameras.main.scrollY -= speed;
    }
    if (this.cursors.down.isDown) {
      this.cameras.main.scrollY += speed;
    }
  }
}
