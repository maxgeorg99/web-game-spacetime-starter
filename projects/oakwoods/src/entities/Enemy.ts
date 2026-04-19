import Phaser from "phaser";

export interface EnemyConfig {
  id: string;
  keyPrefix: string;       // e.g. "enemy-skeleton-mage"
  displayHeight: number;   // target pixel height on screen (sprite scaled to this)
  /** Fraction of the frame height where the character's feet sit (0..1 from top). */
  footRatio: number;
  maxHp: number;
  touchDamage: number;
  patrolSpeed: number;
  chaseSpeed: number;
  aggroRange: number;
  attackRange: number;
  attackCooldownMs: number;
  bodyWidth: number;       // arcade body size in screen pixels (post-scale)
  bodyHeight: number;
}

export const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  skeleton_mage: {
    id: "skeleton_mage",
    keyPrefix: "enemy-skeleton-mage",
    displayHeight: 72,
    footRatio: 0.875,
    maxHp: 20,
    touchDamage: 10,
    patrolSpeed: 25,
    chaseSpeed: 55,
    aggroRange: 90,
    attackRange: 34,
    attackCooldownMs: 1000,
    bodyWidth: 22,
    bodyHeight: 42,
  },
  skull: {
    id: "skull",
    keyPrefix: "enemy-skull",
    displayHeight: 50,
    footRatio: 0.677,
    maxHp: 8,
    touchDamage: 8,
    patrolSpeed: 30,
    chaseSpeed: 65,
    aggroRange: 100,
    attackRange: 32,
    attackCooldownMs: 1500,
    bodyWidth: 22,
    bodyHeight: 40,
  },
  spider: {
    id: "spider",
    keyPrefix: "enemy-spider",
    displayHeight: 50,
    footRatio: 0.714,
    maxHp: 14,
    touchDamage: 6,
    patrolSpeed: 45,
    chaseSpeed: 80,
    aggroRange: 110,
    attackRange: 26,
    attackCooldownMs: 1600,
    bodyWidth: 28,
    bodyHeight: 24,
  },
  bear: {
    id: "bear",
    keyPrefix: "enemy-bear",
    displayHeight: 60,
    footRatio: 0.691,
    maxHp: 80,
    touchDamage: 22,
    patrolSpeed: 16,
    chaseSpeed: 50,
    aggroRange: 110,
    attackRange: 42,
    attackCooldownMs: 2000,
    bodyWidth: 44,
    bodyHeight: 54,
  },
  demon: {
    id: "demon",
    keyPrefix: "enemy-demon",
    displayHeight: 82,
    footRatio: 0.854,
    maxHp: 55,
    touchDamage: 18,
    patrolSpeed: 22,
    chaseSpeed: 70,
    aggroRange: 120,
    attackRange: 38,
    attackCooldownMs: 850,
    bodyWidth: 28,
    bodyHeight: 50,
  },
};

type EnemyState = "patrol" | "chase" | "attack" | "hit" | "dead";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  public readonly config: EnemyConfig;
  public hp: number;
  public onDealDamage?: (dmg: number) => void;

  private aiState: EnemyState = "patrol";
  private patrolMin: number;
  private patrolMax: number;
  private facing: 1 | -1 = 1;
  private lastAttackAt = 0;
  private invulnUntil = 0;
  private deadFlag = false;
  private bodyTarget!: { w: number; h: number; offX: number; offY: number };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: EnemyConfig,
    patrolRange: number = 60,
  ) {
    super(scene, x, y, `${config.keyPrefix}-idle`, 0);
    this.config = config;
    this.hp = config.maxHp;
    this.patrolMin = x - patrolRange;
    this.patrolMax = x + patrolRange;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Use the SINGLE-FRAME dimensions, not the full spritesheet image width.
    const frameW = this.frame.width;
    const frameH = this.frame.height;
    // Scale based on feet-height (actual character), not the padded frame.
    const visibleHeight = frameH * config.footRatio;
    const targetScale = config.displayHeight / visibleHeight;

    // Origin at the actual feet of the character in the frame, so (x, y) = feet.
    this.setOrigin(0.5, config.footRatio);
    this.setScale(targetScale);

    // Body sizing target in UNSCALED frame pixels; actual apply must happen AFTER
    // the caller adds this sprite to a physics group (groups overwrite body size
    // and offset on .add()).
    const frameBodyW = config.bodyWidth / targetScale;
    const frameBodyH = config.bodyHeight / targetScale;
    this.bodyTarget = {
      w: frameBodyW,
      h: frameBodyH,
      offX: (frameW - frameBodyW) / 2,
      offY: frameH * config.footRatio - frameBodyH,
    };
    this.applyBodyShape();

    this.setCollideWorldBounds(false);
    this.setBounce(0);

    this.ensureAnimations(scene);
    this.playAnim("idle");

    this.on(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      (anim: Phaser.Animations.Animation) => {
        if (anim.key === `${config.keyPrefix}-attack`) {
          if (this.aiState === "attack") this.aiState = "chase";
        } else if (anim.key === `${config.keyPrefix}-death`) {
          this.destroy();
        }
      },
    );
  }

  /** Apply body size/offset. Must be called AFTER any physics-group .add(), since
   * adding to a physics group overwrites body.offset based on the sprite's current
   * display dimensions. */
  public applyBodyShape(): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    body.setSize(this.bodyTarget.w, this.bodyTarget.h, false);
    body.setOffset(this.bodyTarget.offX, this.bodyTarget.offY);
  }

  private ensureAnimations(scene: Phaser.Scene): void {
    const p = this.config.keyPrefix;
    const defs = [
      { key: `${p}-idle`,   rate: 8,  repeat: -1 },
      { key: `${p}-run`,    rate: 10, repeat: -1 },
      { key: `${p}-attack`, rate: 14, repeat: 0  },
      { key: `${p}-death`,  rate: 10, repeat: 0  },
    ];
    for (const d of defs) {
      if (scene.anims.exists(d.key)) continue;
      const tex = scene.textures.get(d.key);
      const total = tex.frameTotal - 1; // minus __BASE
      if (total <= 0) continue;
      scene.anims.create({
        key: d.key,
        frames: scene.anims.generateFrameNumbers(d.key, { start: 0, end: total - 1 }),
        frameRate: d.rate,
        repeat: d.repeat,
      });
    }
  }

  private playAnim(suffix: "idle" | "run" | "attack" | "death"): void {
    const key = `${this.config.keyPrefix}-${suffix}`;
    if (this.anims.currentAnim?.key !== key) this.play(key);
  }

  public takeDamage(dmg: number, fromX: number): boolean {
    if (this.deadFlag) return false;
    const now = this.scene.time.now;
    if (now < this.invulnUntil) return false;
    this.hp -= dmg;
    this.invulnUntil = now + 220;
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    // Knockback away from damage source
    const dir = this.x < fromX ? -1 : 1;
    this.setVelocityX(dir * 90);
    this.setVelocityY(-140);
    this.aiState = "hit";
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.clearTint());
    this.scene.time.delayedCall(240, () => {
      if (!this.deadFlag && this.aiState === "hit") this.aiState = "chase";
    });
    return false;
  }

  private die(): void {
    this.deadFlag = true;
    this.aiState = "dead";
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setTint(0xff6666);
    this.scene.time.delayedCall(120, () => this.clearTint());
    this.playAnim("death");
  }

  public isDead(): boolean {
    return this.deadFlag;
  }

  /** Check whether attack is currently active (mid-swing). */
  public isAttackingActive(): boolean {
    if (this.aiState !== "attack") return false;
    const anim = this.anims.currentAnim;
    if (!anim || anim.key !== `${this.config.keyPrefix}-attack`) return false;
    const frameIdx = this.anims.currentFrame?.index ?? 0;
    const total = anim.frames.length;
    // Damage window: middle 40% of the attack swing
    return frameIdx >= Math.floor(total * 0.3) && frameIdx <= Math.ceil(total * 0.7);
  }

  public updateAI(player: Phaser.Physics.Arcade.Sprite): void {
    if (this.deadFlag) return;

    const now = this.scene.time.now;
    const dx = player.x - this.x;
    const ady = Math.abs(player.y - this.y);
    const adx = Math.abs(dx);
    const playerAlive = (player.getData("hp") ?? 1) > 0;

    // Face player during combat, patrol direction otherwise
    if (this.aiState === "chase" || this.aiState === "attack") {
      this.facing = dx >= 0 ? 1 : -1;
    }
    this.setFlipX(this.facing === -1);

    switch (this.aiState) {
      case "hit":
        // velocity already applied; animation handled via tint
        this.playAnim("idle");
        break;

      case "patrol": {
        if (playerAlive && adx < this.config.aggroRange && ady < 60) {
          this.aiState = "chase";
          break;
        }
        // Bounce between patrol bounds
        if (this.x <= this.patrolMin) this.facing = 1;
        else if (this.x >= this.patrolMax) this.facing = -1;
        this.setVelocityX(this.facing * this.config.patrolSpeed);
        this.playAnim("run");
        break;
      }

      case "chase": {
        if (!playerAlive) {
          this.aiState = "patrol";
          break;
        }
        if (adx > this.config.aggroRange * 1.6) {
          this.aiState = "patrol";
          break;
        }
        // Within attack range: stop and either attack (cooldown ready) or wait.
        if (adx <= this.config.attackRange && ady < 32) {
          this.setVelocityX(0);
          if (now - this.lastAttackAt >= this.config.attackCooldownMs) {
            this.aiState = "attack";
            this.lastAttackAt = now;
            this.playAnim("attack");
          } else {
            this.playAnim("idle");
          }
          break;
        }
        this.setVelocityX(this.facing * this.config.chaseSpeed);
        this.playAnim("run");
        break;
      }

      case "attack": {
        this.setVelocityX(0);
        // Damage is applied in updateAI via onDealDamage callback hooked to scene overlap check
        if (this.isAttackingActive() && adx <= this.config.attackRange + 6 && ady < 34) {
          const hitKey = "__last_hit";
          const lastHit = this.getData(hitKey) ?? 0;
          if (now - lastHit > this.config.attackCooldownMs * 0.9) {
            this.setData(hitKey, now);
            this.onDealDamage?.(this.config.touchDamage);
          }
        }
        break;
      }
    }
  }
}
