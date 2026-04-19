import Phaser from "phaser";
import { ENEMY_CONFIGS } from "../entities/Enemy";
import { OakWoodsNet, PlayerStateView } from "../network/ColyseusClient";

interface RemoteAvatar {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
  animState: string;
  facing: number;
}

interface RemoteEnemy {
  sprite: Phaser.GameObjects.Sprite;
  type: string;
  targetX: number;
  targetY: number;
  hp: number;
  animState: string;
}

export class GameScene extends Phaser.Scene {
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private map!: Phaser.Tilemaps.Tilemap;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey!: Phaser.Input.Keyboard.Key;

  // Background layers for parallax scrolling
  private bgLayer1!: Phaser.GameObjects.TileSprite;
  private bgLayer2!: Phaser.GameObjects.TileSprite;
  private bgLayer3!: Phaser.GameObjects.TileSprite;

  // Track how far ground has been generated
  private groundGeneratedToX: number = 0;

  // Attack state (local animation only; server resolves damage)
  private isAttacking: boolean = false;
  private readonly PLAYER_MAX_HP = 100;
  private playerHp = 100;

  // HUD (camera-fixed)
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;

  // End-game state
  private gameOver = false;
  private won = false;
  private endOverlay?: Phaser.GameObjects.Container;
  private restartKey!: Phaser.Input.Keyboard.Key;

  // Multiplayer
  private net?: OakWoodsNet;
  private remotes = new Map<string, RemoteAvatar>();
  private remoteEnemies = new Map<string, RemoteEnemy>();
  private lastInputSentAt = 0;
  private lastSentSnapshot = { x: 0, y: 0, facing: 0, animState: "" };
  private netStatusText?: Phaser.GameObjects.Text;
  private serverPhase = "playing";

  constructor() {
    super("GameScene");
  }

  create(): void {
    // Reset scene-scoped state (Phaser reuses the instance on scene.restart).
    this.isAttacking = false;
    this.gameOver = false;
    this.won = false;
    this.endOverlay = undefined;
    this.playerHp = this.PLAYER_MAX_HP;
    this.serverPhase = "playing";

    // === BACKGROUND LAYERS (Parallax) ===
    this.bgLayer1 = this.add.tileSprite(0, 0, 320, 180, "oakwoods-bg-layer1")
      .setOrigin(0, 0).setScrollFactor(0);
    this.bgLayer2 = this.add.tileSprite(0, 0, 320, 180, "oakwoods-bg-layer2")
      .setOrigin(0, 0).setScrollFactor(0);
    this.bgLayer3 = this.add.tileSprite(0, 0, 320, 180, "oakwoods-bg-layer3")
      .setOrigin(0, 0).setScrollFactor(0);

    // === GROUND TILEMAP ===
    this.map = this.make.tilemap({
      tileWidth: 24,
      tileHeight: 24,
      width: 500,
      height: 8,
    });
    const tileset = this.map.addTilesetImage("oakwoods-tileset");
    if (!tileset) {
      console.error("Failed to add tileset");
      return;
    }
    const layer = this.map.createBlankLayer("ground", tileset, 0, 16);
    if (!layer) {
      console.error("Failed to create layer");
      return;
    }
    this.groundLayer = layer;

    const initialGround = 140;
    for (let x = 0; x < initialGround; x++) {
      this.map.putTileAt(0, x, 7, true, "ground");
    }
    this.groundGeneratedToX = initialGround;
    this.groundLayer.setCollisionByExclusion([-1]);

    // === DECORATIONS ===
    const groundY = 184;
    this.add.image(250, groundY, "oakwoods-shop").setOrigin(0.5, 1);
    this.add.image(50, groundY, "oakwoods-lamp").setOrigin(0.5, 1);
    this.add.image(180, groundY, "oakwoods-lamp").setOrigin(0.5, 1);
    this.add.image(320, groundY, "oakwoods-sign").setOrigin(0.5, 1);
    this.add.image(400, groundY, "oakwoods-fence1").setOrigin(0.5, 1);
    this.add.image(470, groundY, "oakwoods-fence2").setOrigin(0.5, 1);
    this.add.image(140, groundY, "oakwoods-rock1").setOrigin(0.5, 1);
    this.add.image(350, groundY, "oakwoods-rock2").setOrigin(0.5, 1);
    this.add.image(550, groundY, "oakwoods-rock3").setOrigin(0.5, 1);
    this.add.image(70, groundY, "oakwoods-grass1").setOrigin(0.5, 1);
    this.add.image(120, groundY, "oakwoods-grass2").setOrigin(0.5, 1);
    this.add.image(200, groundY, "oakwoods-grass3").setOrigin(0.5, 1);
    this.add.image(280, groundY, "oakwoods-grass1").setOrigin(0.5, 1);
    this.add.image(380, groundY, "oakwoods-grass2").setOrigin(0.5, 1);
    this.add.image(450, groundY, "oakwoods-grass3").setOrigin(0.5, 1);

    // === PLAYER CHARACTER ===
    this.player = this.physics.add.sprite(100, 120, "oakwoods-char-blue", 0);
    this.player.setBounce(0);
    this.player.body?.setSize(20, 38);
    this.player.body?.setOffset(18, 16);
    this.physics.add.collider(this.player, this.groundLayer);

    // === CAMERA ===
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(50, 50);
    this.physics.world.setBounds(0, 0, 500 * 24, 180);
    this.player.setCollideWorldBounds(true);
    this.player.body?.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, 999999, 180));

    // === ANIMATIONS ===
    this.createPlayerAnimations();
    this.createEnemyAnimations();
    this.player.anims.play("char-blue-idle", true);

    this.player.on("animationcomplete", (anim: Phaser.Animations.Animation) => {
      if (anim.key === "char-blue-attack") {
        this.isAttacking = false;
      }
    });

    // === INPUT ===
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // === HUD ===
    this.buildHud();

    // === MULTIPLAYER ===
    // Clear lingering refs from scene.restart().
    for (const avatar of this.remotes.values()) {
      avatar.sprite.destroy();
      avatar.label.destroy();
    }
    this.remotes.clear();
    for (const enemy of this.remoteEnemies.values()) {
      enemy.sprite.destroy();
    }
    this.remoteEnemies.clear();
    this.connectToServer();
  }

  private createPlayerAnimations(): void {
    const defs: Array<[string, number, number, number, number]> = [
      ["idle", 0, 5, 8, -1],
      ["run", 16, 21, 10, -1],
      ["jump", 28, 31, 10, 0],
      ["fall", 35, 37, 10, 0],
      ["attack", 8, 13, 12, 0],
      ["death", 49, 55, 8, 0],
    ];
    for (const [suffix, start, end, rate, repeat] of defs) {
      const key = `char-blue-${suffix}`;
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers("oakwoods-char-blue", { start, end }),
        frameRate: rate,
        repeat,
      });
    }
  }

  private createEnemyAnimations(): void {
    for (const cfg of Object.values(ENEMY_CONFIGS)) {
      const defs = [
        { suffix: "idle", rate: 8, repeat: -1 },
        { suffix: "run", rate: 10, repeat: -1 },
        { suffix: "attack", rate: 14, repeat: 0 },
        { suffix: "death", rate: 10, repeat: 0 },
      ];
      for (const d of defs) {
        const key = `${cfg.keyPrefix}-${d.suffix}`;
        if (this.anims.exists(key)) continue;
        if (!this.textures.exists(key)) continue;
        const tex = this.textures.get(key);
        const total = tex.frameTotal - 1;
        if (total <= 0) continue;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: total - 1 }),
          frameRate: d.rate,
          repeat: d.repeat,
        });
      }
    }
  }

  private connectToServer(): void {
    this.netStatusText = this.add.text(6, 170, "connecting…", {
      fontSize: "8px",
      color: "#aaaaaa",
    }).setScrollFactor(0).setDepth(1000);

    const name = `P${Math.floor(Math.random() * 1000)}`;
    const net = new OakWoodsNet();
    this.net = net;

    net.join(name).then((room) => {
      this.netStatusText?.setText(`online · ${name}`).setColor("#7fffa0");

      const $ = net.callbacks!;

      // === player state ===
      $(room.state).players.onAdd((player: PlayerStateView, sessionId: string) => {
        if (sessionId === net.sessionId) {
          // Own player: mirror authoritative hp + invuln into local state.
          this.playerHp = player.hp;
          this.updateHud();
          $(player).listen("hp", (v: number, prev: number) => this.onOwnHpChanged(v, prev));
          return;
        }
        this.addRemotePlayer(sessionId, player);
      });

      $(room.state).players.onRemove((_player: PlayerStateView, sessionId: string) => {
        this.removeRemotePlayer(sessionId);
      });

      // === enemy state ===
      $(room.state).enemies.onAdd((enemy: any, id: string) => {
        this.addRemoteEnemy(id, enemy);
      });
      $(room.state).enemies.onRemove((_e: any, id: string) => {
        this.removeRemoteEnemy(id);
      });

      // === phase ===
      $(room.state).listen("phase", (v: string) => {
        this.serverPhase = v;
        if (v === "victory" && !this.won && !this.gameOver) {
          this.won = true;
          this.showEndScreen(true);
        }
      });

      room.onMessage("playerAttack", (payload: { sessionId: string }) => {
        const avatar = this.remotes.get(payload.sessionId);
        if (avatar) avatar.sprite.anims.play("char-blue-attack", true);
      });

      room.onLeave(() => {
        this.netStatusText?.setText("disconnected").setColor("#ff7070");
      });

      room.onError((code, message) => {
        console.warn("[oakwoods] room error", code, message);
      });
    }).catch((err) => {
      console.warn("[oakwoods] multiplayer disabled:", err?.message ?? err);
      this.netStatusText?.setText("offline (solo)").setColor("#ff9060");
      this.net = undefined;
    });
  }

  // ───────────────────────── remote players ─────────────────────────

  private addRemotePlayer(sessionId: string, player: PlayerStateView): void {
    const sprite = this.add.sprite(player.x, player.y, "oakwoods-char-blue", 0);
    sprite.setTint(0xffc0a0);
    sprite.setDepth(5);
    sprite.anims.play("char-blue-idle", true);
    sprite.setFlipX(player.facing === 1);

    const label = this.add.text(player.x, player.y - 30, player.name || sessionId.slice(0, 4), {
      fontSize: "8px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(6);

    const avatar: RemoteAvatar = {
      sprite,
      label,
      targetX: player.x,
      targetY: player.y,
      animState: player.animState,
      facing: player.facing,
    };

    const $ = this.net!.callbacks!;
    $(player).listen("x", (v: number) => { avatar.targetX = v; });
    $(player).listen("y", (v: number) => { avatar.targetY = v; });
    $(player).listen("facing", (v: number) => { avatar.facing = v; sprite.setFlipX(v === 1); });
    $(player).listen("animState", (v: string) => {
      avatar.animState = v;
      this.playRemoteAnim(sprite, v);
    });
    $(player).listen("hp", (v: number, prev: number) => {
      if (v < prev) this.flashSprite(sprite);
    });

    this.remotes.set(sessionId, avatar);
  }

  private removeRemotePlayer(sessionId: string): void {
    const avatar = this.remotes.get(sessionId);
    if (!avatar) return;
    avatar.sprite.destroy();
    avatar.label.destroy();
    this.remotes.delete(sessionId);
  }

  private playRemoteAnim(sprite: Phaser.GameObjects.Sprite, state: string): void {
    const current = sprite.anims.currentAnim?.key;
    const key = `char-blue-${state}`;
    if (current === key) return;
    if (current === "char-blue-attack" && sprite.anims.isPlaying && state !== "attack") return;
    if (this.anims.exists(key)) sprite.anims.play(key, true);
  }

  // ───────────────────────── remote enemies ─────────────────────────

  private addRemoteEnemy(id: string, enemy: any): void {
    const cfg = ENEMY_CONFIGS[enemy.enemyType as keyof typeof ENEMY_CONFIGS];
    if (!cfg) return;
    const key = `${cfg.keyPrefix}-idle`;
    if (!this.textures.exists(key)) return;

    const sprite = this.add.sprite(enemy.x, enemy.y, key, 0).setDepth(4);

    const frameH = sprite.frame.height;
    const visibleHeight = frameH * cfg.footRatio;
    const scale = cfg.displayHeight / visibleHeight;
    sprite.setOrigin(0.5, cfg.footRatio);
    sprite.setScale(scale);
    sprite.setFlipX(enemy.facing === 1);
    this.playEnemyAnim(sprite, cfg.keyPrefix, enemy.animState);

    const remote: RemoteEnemy = {
      sprite,
      type: enemy.enemyType,
      targetX: enemy.x,
      targetY: enemy.y,
      hp: enemy.hp,
      animState: enemy.animState,
    };

    const $ = this.net!.callbacks!;
    $(enemy).listen("x", (v: number) => { remote.targetX = v; });
    $(enemy).listen("y", (v: number) => { remote.targetY = v; });
    $(enemy).listen("facing", (v: number) => { sprite.setFlipX(v === 1); });
    $(enemy).listen("animState", (v: string) => {
      remote.animState = v;
      this.playEnemyAnim(sprite, cfg.keyPrefix, v);
    });
    $(enemy).listen("hp", (v: number, prev: number) => {
      if (v < prev) this.flashSprite(sprite, 0xffffff);
      remote.hp = v;
    });

    this.remoteEnemies.set(id, remote);
  }

  private removeRemoteEnemy(id: string): void {
    const remote = this.remoteEnemies.get(id);
    if (!remote) return;
    remote.sprite.destroy();
    this.remoteEnemies.delete(id);
  }

  private playEnemyAnim(sprite: Phaser.GameObjects.Sprite, prefix: string, state: string): void {
    const mapped = state === "run" ? "run" : state === "attack" ? "attack" : state === "death" ? "death" : "idle";
    const key = `${prefix}-${mapped}`;
    if (sprite.anims.currentAnim?.key === key) return;
    if (this.anims.exists(key)) sprite.anims.play(key, true);
  }

  // ─────────────────────── player hp / VFX / end ────────────────────

  private onOwnHpChanged(newHp: number, prevHp: number): void {
    this.playerHp = newHp;
    this.updateHud();
    if (newHp < prevHp && newHp > 0) {
      this.flashSprite(this.player);
      // Small local knockback so damage is felt kinetically.
      const body = this.player.body as Phaser.Physics.Arcade.Body | null;
      if (body) {
        const facing = this.player.flipX ? 1 : -1;
        this.player.setVelocityX(facing * 120);
        this.player.setVelocityY(-140);
      }
      this.cameras.main.shake(80, 0.003);
    }
    if (newHp <= 0 && !this.gameOver) {
      this.gameOver = true;
      this.isAttacking = true;
      this.player.setVelocity(0, 0);
      this.player.anims.play("char-blue-death", true);
      this.time.delayedCall(600, () => this.showEndScreen(false));
    }
    if (newHp > 0 && prevHp <= 0) {
      // Respawned
      this.gameOver = false;
      this.isAttacking = false;
      this.endOverlay?.destroy();
      this.endOverlay = undefined;
      this.player.anims.play("char-blue-idle", true);
    }
  }

  private flashSprite(sprite: Phaser.GameObjects.Sprite, color: number = 0xff4444): void {
    sprite.setTintFill(color);
    this.time.delayedCall(90, () => sprite.clearTint());
  }

  private buildHud(): void {
    this.hpBarBg = this.add.rectangle(6, 6, 64, 6, 0x000000, 0.65)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(1000);
    this.hpBarFill = this.add.rectangle(7, 7, 62, 4, 0xe04040)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(1001);
    this.hpText = this.add.text(74, 4, `${this.playerHp}/${this.PLAYER_MAX_HP}`, {
      fontSize: "8px",
      color: "#ffffff",
    }).setScrollFactor(0).setDepth(1001);
  }

  private showEndScreen(victory: boolean): void {
    if (this.endOverlay) return;
    const cam = this.cameras.main;
    const w = cam.width;
    const h = cam.height;
    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(2000);
    const dim = this.add.rectangle(0, 0, w, h, 0x000000, 0.72).setOrigin(0, 0);
    const color = victory ? "#ffe066" : "#ff5555";
    const title = this.add.text(w / 2, h / 2 - 24, victory ? "VICTORY!" : "GAME OVER", {
      fontSize: "28px",
      color,
      fontStyle: "bold",
    }).setOrigin(0.5);
    const sub = this.add.text(w / 2, h / 2 + 6, victory ? "The bosses have fallen!" : "You have fallen.", {
      fontSize: "9px",
      color: "#ffffff",
    }).setOrigin(0.5);
    const hint = this.add.text(w / 2, h / 2 + 28, victory ? "Press R to reset enemies" : "Press R to respawn", {
      fontSize: "9px",
      color: "#aaaaaa",
    }).setOrigin(0.5);
    container.add([dim, title, sub, hint]);
    this.endOverlay = container;
  }

  private updateHud(): void {
    const pct = Math.max(0, this.playerHp / this.PLAYER_MAX_HP);
    this.hpBarFill.width = 62 * pct;
    this.hpText.setText(`${this.playerHp}/${this.PLAYER_MAX_HP}`);
  }

  // ──────────────────────────── update ───────────────────────────────

  update(): void {
    // R key: respawn on death or reset enemies after victory.
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      if (this.gameOver) {
        this.net?.sendRespawn();
      } else if (this.won) {
        this.net?.sendResetEnemies();
        this.won = false;
        this.endOverlay?.destroy();
        this.endOverlay = undefined;
      }
    }

    const speed = 100;
    const jumpVelocity = -250;
    const onGround = this.player.body?.blocked.down;
    const velocityY = this.player.body?.velocity.y ?? 0;
    const isMovingHorizontally = this.cursors.left.isDown || this.cursors.right.isDown;

    // Block input when dead.
    const inputLocked = this.gameOver || this.playerHp <= 0;

    if (!inputLocked) {
      if (this.cursors.left.isDown) {
        this.player.setVelocityX(-speed);
        this.player.setFlipX(true);
      } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(speed);
        this.player.setFlipX(false);
      } else if (!this.isAttacking) {
        this.player.setVelocityX(0);
      }

      if (this.cursors.up.isDown && onGround && !this.isAttacking) {
        this.player.setVelocityY(jumpVelocity);
      }

      if (
        Phaser.Input.Keyboard.JustDown(this.attackKey) &&
        onGround &&
        !this.isAttacking
      ) {
        this.isAttacking = true;
        this.player.setVelocityX(0);
        this.player.anims.play("char-blue-attack", true);
        this.net?.sendAttack({
          x: this.player.x,
          y: this.player.y,
          facing: this.player.flipX ? 1 : 0,
        });
      }
    }

    // === ANIMATION STATE MACHINE ===
    if (!this.isAttacking && !inputLocked) {
      if (!onGround) {
        this.player.anims.play(velocityY < 0 ? "char-blue-jump" : "char-blue-fall", true);
      } else {
        this.player.anims.play(isMovingHorizontally ? "char-blue-run" : "char-blue-idle", true);
      }
    }

    // === PARALLAX SCROLLING ===
    const camX = this.cameras.main.scrollX;
    this.bgLayer1.tilePositionX = camX * 0.1;
    this.bgLayer2.tilePositionX = camX * 0.3;
    this.bgLayer3.tilePositionX = camX * 0.5;

    // === INFINITE GROUND GENERATION ===
    const playerTileX = Math.floor(this.player.x / 24);
    const generateAhead = 20;
    if (playerTileX + generateAhead > this.groundGeneratedToX) {
      const tilesToGenerate = (playerTileX + generateAhead) - this.groundGeneratedToX;
      for (let i = 0; i < tilesToGenerate; i++) {
        const x = this.groundGeneratedToX + i;
        if (x < 500) {
          this.map.putTileAt(0, x, 7, true, "ground");
        }
      }
      this.groundGeneratedToX = Math.min(playerTileX + generateAhead, 500);
    }

    // === MULTIPLAYER SYNC ===
    this.interpolateRemotes();
    this.maybeSendLocalState(onGround ?? false, isMovingHorizontally, velocityY);
  }

  private interpolateRemotes(): void {
    const lerp = 0.25;
    for (const avatar of this.remotes.values()) {
      avatar.sprite.x = Phaser.Math.Linear(avatar.sprite.x, avatar.targetX, lerp);
      avatar.sprite.y = Phaser.Math.Linear(avatar.sprite.y, avatar.targetY, lerp);
      avatar.label.x = avatar.sprite.x;
      avatar.label.y = avatar.sprite.y - 30;
    }
    for (const enemy of this.remoteEnemies.values()) {
      enemy.sprite.x = Phaser.Math.Linear(enemy.sprite.x, enemy.targetX, lerp);
      enemy.sprite.y = Phaser.Math.Linear(enemy.sprite.y, enemy.targetY, lerp);
    }
  }

  private maybeSendLocalState(onGround: boolean, moving: boolean, velocityY: number): void {
    if (!this.net) return;
    const now = this.time.now;
    if (now - this.lastInputSentAt < 50) return;

    let animState: string;
    if (this.playerHp <= 0) animState = "death";
    else if (this.isAttacking) animState = "attack";
    else if (!onGround) animState = velocityY < 0 ? "jump" : "fall";
    else if (moving) animState = "run";
    else animState = "idle";

    const facing = this.player.flipX ? 1 : 0;
    const snap = this.lastSentSnapshot;
    const moved =
      Math.abs(this.player.x - snap.x) > 0.5 ||
      Math.abs(this.player.y - snap.y) > 0.5 ||
      snap.facing !== facing ||
      snap.animState !== animState;
    if (!moved) return;

    this.net.sendInput({
      x: this.player.x,
      y: this.player.y,
      facing,
      animState,
    });
    snap.x = this.player.x;
    snap.y = this.player.y;
    snap.facing = facing;
    snap.animState = animState;
    this.lastInputSentAt = now;
  }
}
