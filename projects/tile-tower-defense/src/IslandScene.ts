import { compactLayout } from './mobile-layout';
import { campaignBiome } from '../shared/config/biomes';
import { deathSheets, deathPresentation } from '../shared/config/death-art';
import { pathFor } from '../shared/game/paths';
import { t } from './i18n';
import { assetUrl } from './assets';
import { factionArt } from '../shared/config/factions';
import Phaser from 'phaser';
import type { Point } from '../shared/game/model';
import type { Flight } from '../shared/game/world';
import { fresh, expansionCells, sameCell } from '../shared/game/rules';
import { worldBalance } from '../shared/config/world';
import { worldIslands } from './i18n/content';
import type { GameStore } from './store';
import { images, sheets } from './art';
import { IslandView } from './IslandView';
import { IslandAtmosphere } from './IslandAtmosphere';

/** One camera and one scene, with up to sixteen independent snapshot renderers. */
export class IslandScene extends Phaser.Scene {
  onSelect: (point: Point) => void = () => {};
  onInspect: (slot: number) => void = () => {};
  private views: IslandView[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private atmosphere?: IslandAtmosphere;
  private airships = new Map<number, Phaser.GameObjects.Container>();
  private flightSnapshots = new Map<number, { elapsed: number; receivedAt: number }>();
  private unsubscribe?: () => void;
  private dragStart?: { x: number; y: number; scrollX: number; scrollY: number };
  private dragged = false;
  private touchPositions = new Map<number, Point>();
  private pinch?: { distance: number; zoom: number; anchor: Point };
  private focused = false;
  private manualCamera = false;
  private framingSignature = '';
  private focusSlot: number | null = null;
  private database?: string;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  constructor(private store: GameStore) {
    super('Island');
  }
  preload() {
    for (const key of images) {
      this.load.image(key, `${assetUrl(`art/${key}.png`)}`);
    }
    for (const [key, sheet] of Object.entries({ ...sheets, ...deathSheets })) {
      this.load.spritesheet(key, `${assetUrl(`art/${key}.png`)}`, {
        frameWidth: sheet.size,
        frameHeight: sheet.size,
      });
    }
  }
  create() {
    for (const key of [...images, ...Object.keys(sheets), ...Object.keys(deathSheets)]) {
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
    for (const [key, sheet] of Object.entries(deathSheets)) {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: sheet.frames - 1 }),
        frameRate: deathPresentation.framesPerSecond,
        repeat: 0,
      });
    }
    this.atmosphere = new IslandAtmosphere(this);
    const islands = this.store.online
      ? worldIslands
      : [{ slot: 0, name: t('island.yours'), x: 0, y: 0, color: 0x6e9cbe }];
    for (const island of islands) {
      const view = new IslandView(
        this,
        fresh(),
        island,
        this.store.online ? worldIslands[island.slot].faction : 'blue',
      );
      this.views.push(view);
      this.labels.push(
        this.add
          .text(island.x + 500, island.y + 426, island.name, {
            fontFamily: 'Fira',
            fontSize: '12px',
            resolution: 3,
            color: '#465d57',
            backgroundColor: '#f9f7e9',
            padding: { x: 6, y: 3 },
            align: 'center',
            wordWrap: { width: 220 },
          })
          .setOrigin(0.5, 0)
          .setDepth(1000),
      );
    }
    this.cursors = this.input.keyboard?.createCursorKeys();
    const canvas = this.game.canvas;
    // Track browser pointer IDs directly. Phaser touch moves stop at DOM overlays,
    // while pointer capture keeps both fingers attached to their starting canvas.
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || this.touchPositions.size >= 2) {
        return;
      }
      const pointer = this.canvasPointer(event);
      if (!this.store.ready) {
        return;
      }
      canvas.setPointerCapture(event.pointerId);
      this.touchPositions.set(pointer.id, { x: pointer.x, y: pointer.y });
      if (this.touchPositions.size === 2) {
        this.manualCamera = true;
        const [a, b] = [...this.touchPositions.values()];
        this.pinch = {
          distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
          zoom: this.cameras.main.zoom,
          anchor: this.cameraPoint((a.x + b.x) / 2, (a.y + b.y) / 2),
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
    };
    const pointerMove = (event: PointerEvent) => {
      const pointer = this.canvasPointer(event);
      const tracked = this.touchPositions.has(pointer.id);
      if (!tracked && (event.pointerType !== 'mouse' || event.buttons !== 0)) {
        return;
      }
      if (tracked) {
        this.touchPositions.set(pointer.id, { x: pointer.x, y: pointer.y });
      }
      if (this.pinch && this.touchPositions.size === 2) {
        const [a, b] = [...this.touchPositions.values()];
        const camera = this.cameras.main;
        camera.setZoom(
          Phaser.Math.Clamp(
            (this.pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / this.pinch.distance,
            (this.store.world?.seats.length ?? 4) > 4 ? 0.02 : 0.1,
            2.2,
          ),
        );
        const current = this.cameraPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
        camera.setScroll(
          camera.scrollX + this.pinch.anchor.x - current.x,
          camera.scrollY + this.pinch.anchor.y - current.y,
        );
        return;
      }
      if (tracked && this.dragStart) {
        const dx = pointer.x - this.dragStart.x,
          dy = pointer.y - this.dragStart.y;
        if (Math.hypot(dx, dy) > 5) {
          this.dragged = true;
        }
        if (this.dragged) {
          this.manualCamera = true;
          this.cameras.main.setScroll(
            this.dragStart.scrollX - dx / this.cameras.main.zoom,
            this.dragStart.scrollY - dy / this.cameras.main.zoom,
          );
          return;
        }
      }
      const point = this.cameraPoint(pointer.x, pointer.y);
      this.ownView?.setHover(this.ownView.unproject(point.x, point.y));
    };
    const pointerUp = (event: PointerEvent) => {
      const pointer = this.canvasPointer(event);
      if (!this.touchPositions.has(pointer.id)) {
        return;
      }
      this.releasePointer(pointer.id);
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      if (
        !this.store.ready ||
        pointer.x < 0 ||
        pointer.y < 0 ||
        pointer.x > this.scale.width ||
        pointer.y > this.scale.height
      ) {
        return;
      }
      if (this.dragged) {
        return;
      }
      const point = this.cameraPoint(pointer.x, pointer.y);
      for (let slot = 0; slot < this.views.length; slot++) {
        if (this.store.world?.round && !this.store.world.seats[slot]?.owner) {
          continue;
        }
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
    };
    const pointerCancel = (event: PointerEvent) => {
      if (!this.touchPositions.has(event.pointerId)) {
        return;
      }
      this.dragged = true;
      this.releasePointer(event.pointerId);
    };
    const cancelGesture = () => {
      for (const id of this.touchPositions.keys()) {
        if (canvas.hasPointerCapture(id)) {
          canvas.releasePointerCapture(id);
        }
      }
      this.touchPositions.clear();
      this.pinch = undefined;
      this.dragStart = undefined;
      this.dragged = true;
    };
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerCancel);
    canvas.addEventListener('lostpointercapture', pointerCancel);
    window.addEventListener('blur', cancelGesture);
    this.scale.on('resize', cancelGesture);
    this.events.once('shutdown', () => {
      cancelGesture();
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerCancel);
      canvas.removeEventListener('lostpointercapture', pointerCancel);
      window.removeEventListener('blur', cancelGesture);
      this.scale.off('resize', cancelGesture);
    });
    this.input.on(
      'wheel',
      (pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
        this.manualCamera = true;
        const anchor = this.cameraPoint(pointer.x, pointer.y);
        this.cameras.main.setZoom(
          Phaser.Math.Clamp(
            this.cameras.main.zoom * Math.exp(-dy * 0.001),
            (this.store.world?.seats.length ?? 4) > 4 ? 0.02 : 0.1,
            2.2,
          ),
        );
        const current = this.cameraPoint(pointer.x, pointer.y);
        this.cameras.main.scrollX += anchor.x - current.x;
        this.cameras.main.scrollY += anchor.y - current.y;
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
  private canvasPointer(event: PointerEvent) {
    return {
      id: event.pointerId,
      x: this.scale.transformX(event.pageX),
      y: this.scale.transformY(event.pageY),
    };
  }

  // Read current zoom/scroll directly: Phaser's inverse matrix updates at render time.
  private cameraPoint(x: number, y: number): Point {
    const camera = this.cameras.main;
    return {
      x: camera.scrollX + camera.width / 2 + (x - camera.width / 2) / camera.zoom,
      y: camera.scrollY + camera.height / 2 + (y - camera.height / 2) / camera.zoom,
    };
  }

  private releasePointer(id: number) {
    this.touchPositions.delete(id);
    this.pinch = undefined;
    const remaining = this.touchPositions.values().next().value;
    this.dragStart = remaining
      ? {
          ...remaining,
          scrollX: this.cameras.main.scrollX,
          scrollY: this.cameras.main.scrollY,
        }
      : undefined;
    // Keep the gesture consumed until every finger lifts; never build after a pinch.
    if (remaining) {
      this.dragged = true;
    }
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
  setDraft(kind?: string) {
    this.ownView?.setDraft(kind);
  }
  previewCell(point: Point) {
    this.ownView?.setHover(point);
  }
  clearSelection() {
    this.ownView?.clearSelection();
  }
  focusIsland(slot: number) {
    const island = this.store.online ? worldIslands[slot] : { x: 0, y: 0 };
    if (!island || !this.cameras.main) {
      return;
    }
    this.manualCamera = false;
    this.focusSlot = slot;
    const bounds = this.views[slot]?.bounds();
    if (bounds) {
      this.frame(bounds.x, bounds.y, bounds.width, bounds.height, 1.4);
    } else {
      this.frame(island.x + 500, island.y + 330, 600, 380, 1.4);
    }
  }
  overview() {
    if (!this.cameras.main) {
      return;
    }
    if (!this.store.online) {
      this.focusIsland(0);
      return;
    }
    this.manualCamera = false;
    this.focusSlot = null;
    const bounds = this.views
      .filter(
        (_view, slot) =>
          !!this.store.world?.seats[slot] &&
          (!this.store.world.round || this.store.world.seats[slot].owner),
      )
      .map((view) => view.bounds());
    if (!bounds.length) {
      this.focusIsland(0);
      return;
    }
    const left = Math.min(...bounds.map((b) => b.x - b.width / 2)),
      right = Math.max(...bounds.map((b) => b.x + b.width / 2));
    const top = Math.min(...bounds.map((b) => b.y - b.height / 2)),
      bottom = Math.max(...bounds.map((b) => b.y + b.height / 2));
    this.frame((left + right) / 2, (top + bottom) / 2, right - left, bottom - top, 1.4);
  }
  /** Fit the island into the visible battlefield between compact controls. */
  private frame(x: number, y: number, width: number, height: number, maxZoom: number) {
    const screenWidth = this.scale.width,
      screenHeight = this.scale.height;
    const compact = compactLayout.matches;
    const left = 20;
    let right = screenWidth - 20,
      top = 90,
      bottom = screenHeight - 200;
    if (compact) {
      const bounds = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        return element?.getClientRects().length ? element.getBoundingClientRect() : undefined;
      };
      const hud = bounds('.hud'),
        dock = bounds('.bottom-hud');
      top = (hud?.bottom ?? 50) + 12;
      bottom = screenHeight - 16;
      if (screenWidth > screenHeight) {
        if (!document.body.classList.contains('dock-collapsed')) {
          right = (dock?.left ?? screenWidth) - 12;
        }
      } else {
        bottom = (dock?.top ?? screenHeight - 180) - 12;
      }
    }
    const availableWidth = Math.max(120, right - left);
    const availableHeight = Math.max(120, bottom - top);
    const zoom = Math.max(
      (this.store.world?.seats.length ?? 4) > 4 ? 0.02 : 0.1,
      Math.min(maxZoom, availableWidth / width, availableHeight / height),
    );
    this.cameras.main
      .setZoom(zoom)
      .centerOn(
        x + (screenWidth / 2 - (left + availableWidth / 2)) / zoom,
        y + (screenHeight / 2 - (top + availableHeight / 2)) / zoom,
      );
  }
  refreshFraming() {
    this.resize();
  }
  private resize() {
    // Preserve the selected island / world overview when rotating the device.
    requestAnimationFrame(() => {
      if (!this.scene.isActive()) {
        return;
      }
      if (this.focusSlot !== null) {
        this.focusIsland(this.focusSlot);
      } else {
        this.overview();
      }
    });
  }
  private render() {
    const biome = this.store.world?.biome ?? campaignBiome(this.store.state.campaign);
    if (this.atmosphere && this.atmosphere.biome !== biome) {
      this.atmosphere.destroy();
      this.atmosphere = new IslandAtmosphere(this, biome);
    }
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
      this.flightSnapshots.clear();
    }
    for (let slot = 0; slot < this.views.length; slot++) {
      const seat = this.store.world?.seats[slot];
      const visible = !this.store.online || (!!seat && (!this.store.world?.round || !!seat.owner));
      this.labels[slot].setVisible(visible);
      if (!visible) {
        this.views[slot].reset();
        continue;
      }
      this.views[slot].state = this.store.online ? (seat?.state ?? fresh()) : this.store.state;
      this.views[slot].render();
      const path = pathFor(this.views[slot].state);
      const keep = this.views[slot].project(path[path.length - 1]);
      this.labels[slot].setPosition(keep.x, keep.y + 32);
      if (this.store.online) {
        this.labels[slot].setText(
          `${worldIslands[slot].name}${seat?.owner ? (slot === this.store.ownSlot ? t('world.you') : ' · ' + (seat.name ?? t('world.captain', { id: seat.owner.slice(-4) }))) : ' · ' + t('world.unclaimed')}`,
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
    const framing = JSON.stringify(
      this.views.map((view) => [view.state.tiles.length, view.state.phase === 'draft']),
    );
    if (framing !== this.framingSignature) {
      this.framingSignature = framing;
      // Authoritative drafting updates must not undo the player's pan or pinch.
      if (!this.manualCamera && this.touchPositions.size === 0) {
        if (this.focusSlot !== null) {
          this.focusIsland(this.focusSlot);
        } else {
          this.overview();
        }
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
      const snapshot = this.flightSnapshots.get(flight.id);
      if (!snapshot || snapshot.elapsed !== flight.elapsed) {
        this.flightSnapshots.set(flight.id, { elapsed: flight.elapsed, receivedAt: this.time.now });
      }
      const { x, y } = this.flightPosition(flight, flight.elapsed);
      let ship = this.airships.get(flight.id);
      if (!ship) {
        const art = this.add
          .image(0, 0, factionArt('airship', from.faction))
          .setDisplaySize(112, 112)
          .setFlipX(to.x < from.x);
        const label = this.add
          .text(0, 54, t('count.troops', { count: flight.count }), {
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
    }
    for (const [id, ship] of this.airships) {
      if (!alive.has(id)) {
        this.tweens.killTweensOf(ship);
        ship.destroy(true);
        this.airships.delete(id);
        this.flightSnapshots.delete(id);
      }
    }
  }
  private flightPosition(flight: Flight, elapsed: number) {
    const from = worldIslands[flight.from],
      to = worldIslands[flight.to];
    const origin = this.store.world?.seats[flight.from]?.state;
    const destination = this.store.world?.seats[flight.to]?.state;
    const start = origin
      ? this.views[flight.from].project(pathFor(origin)[pathFor(origin).length - 1])
      : { x: from.x + 500, y: from.y + 330 };
    const end = destination
      ? this.views[flight.to].project(pathFor(destination)[0])
      : { x: to.x + 500, y: to.y + 210 };
    const progress = Phaser.Math.Clamp(elapsed / worldBalance.flightSeconds, 0, 1);
    return {
      x: Phaser.Math.Linear(start.x, end.x, progress),
      y: Phaser.Math.Linear(start.y, end.y, progress) - Math.sin(progress * Math.PI) * 70,
    };
  }
  private updateFlights(time: number, delta: number) {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const flight of this.store.world?.flights ?? []) {
      const ship = this.airships.get(flight.id);
      const snapshot = this.flightSnapshots.get(flight.id);
      if (!ship || !snapshot) {
        continue;
      }
      // Brief prediction bridges snapshot gaps; a stalled connection cannot advance indefinitely.
      // Arrival and troop spawning remain entirely server-owned.
      const elapsed =
        snapshot.elapsed + Phaser.Math.Clamp((time - snapshot.receivedAt) / 1000, 0, 0.25);
      const point = this.flightPosition(flight, elapsed);
      const blend = 1 - Math.exp(-Math.min(delta, 100) / 65);
      ship.setPosition(
        Phaser.Math.Linear(ship.x, point.x, blend),
        Phaser.Math.Linear(ship.y, point.y, blend),
      );
      const art = ship.getAt(0) as Phaser.GameObjects.Image;
      const phase = time / 650 + flight.id * 1.7;
      art.setY(reducedMotion ? 0 : Math.sin(phase) * 1.5);
      art.setRotation(reducedMotion ? 0 : Math.sin(phase * 0.7) * 0.018);
    }
  }
  update(time: number, delta: number) {
    this.atmosphere?.update(delta);
    this.updateFlights(time, delta);
    if (
      !this.store.ready ||
      !this.cursors ||
      ['INPUT', 'SELECT'].includes(document.activeElement?.tagName ?? '')
    ) {
      return;
    }
    if (
      this.cursors.left.isDown ||
      this.cursors.right.isDown ||
      this.cursors.up.isDown ||
      this.cursors.down.isDown
    ) {
      this.manualCamera = true;
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
