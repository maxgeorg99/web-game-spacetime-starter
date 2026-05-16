import Phaser from "phaser";
import { ManifestEntry } from "../types";
import { Card } from "../cards/Card";
import { registerAnimations } from "../cards/AnimationFactory";
import { canPlayCard, applyCardEffect } from "../cards/effects";
import { PlayerState } from "../state/PlayerState";
import { EnemyState } from "../state/EnemyState";
import { EnemyGroup } from "../state/EnemyGroup";
import { DeckState } from "../state/DeckState";
import { RunState } from "../state/RunState";
import { MapNode } from "../state/MapState";
import { HpBar } from "../ui/HpBar";
import { HandUI } from "../ui/HandUI";
import { Combo } from "../combat/Combo";
import { ComboHud } from "../ui/ComboHud";
import { EnemyTemplate, scaleForTier } from "../data/enemies";
import { getAudioManager } from "../audio/AudioManager";
import { unlockNextAscension } from "../state/AscensionState";

interface EnemyVisual {
  sprite: Phaser.GameObjects.Sprite;
  hpBar: HpBar;
  intentText: Phaser.GameObjects.Text;
  nameLabel: Phaser.GameObjects.Text;
  highlightRing: Phaser.GameObjects.Graphics;
  burnText: Phaser.GameObjects.Text;
  animKey: string;
  tpl: EnemyTemplate;
  x: number;
  y: number;
}

function buildRosterForNode(
  node: MapNode,
): { state: EnemyState; tpl: EnemyTemplate }[] {
  const scale = scaleForTier(node.tier);
  return node.encounterTemplates.map((tpl) => ({
    tpl,
    state: new EnemyState(tpl.name, Math.round(tpl.hp * scale), Math.round(tpl.damage * scale)),
  }));
}

function enemyPositions(
  count: number,
  width: number,
  height: number,
): { x: number; y: number }[] {
  const cx = width * 0.74;
  const spread = width * 0.15;
  const cy = height * 0.42;
  if (count === 1) return [{ x: cx, y: cy }];
  if (count === 2)
    return [
      { x: cx - spread, y: cy - 20 },
      { x: cx + spread, y: cy + 20 },
    ];
  return [
    { x: cx - spread * 1.2, y: cy - 40 },
    { x: cx, y: cy },
    { x: cx + spread * 1.2, y: cy + 40 },
  ];
}

export class CombatScene extends Phaser.Scene {
  private runState!: RunState;
  private activeNodeId!: string;
  private isBossFight = false;

  private player!: PlayerState;
  private enemyGroup!: EnemyGroup;
  private enemyVisuals: EnemyVisual[] = [];

  private deck!: DeckState;
  private playerHpBar!: HpBar;
  private handUI!: HandUI;
  private demon!: Phaser.GameObjects.Sprite;
  private endTurnBtn!: Phaser.GameObjects.Text;
  private shieldIcon!: Phaser.GameObjects.Image;
  private shieldText!: Phaser.GameObjects.Text;
  private combo!: Combo;
  private comboHud!: ComboHud;
  private playerTurn = true;

  // Targeting state
  private pendingCard: Card | null = null;
  private cancelBtn: Phaser.GameObjects.Text | null = null;

  constructor() {
    super("CombatScene");
  }

  create(): void {
    // Reset per-fight state carried over from previous scene instance
    this.enemyVisuals = [];
    this.pendingCard = null;
    this.cancelBtn = null;

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#000000");

    // Dark crimson top → near-black bottom
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0505, 0x1a0505, 0x050202, 0x050202, 1);
    bg.fillRect(0, 0, width, height);

    const manifest = this.registry.get("assets") as ManifestEntry;
    registerAnimations(this.anims, manifest.spritesheets);

    this.runState = this.registry.get("runState") as RunState;
    const data = this.scene.settings.data as { nodeId: string };
    this.activeNodeId = data.nodeId;

    const node = this.runState.nodes.find((n) => n.id === this.activeNodeId)!;
    this.isBossFight = node.kind === "boss";

    const roster = buildRosterForNode(node);
    this.enemyGroup = new EnemyGroup(roster.map((r) => r.state));

    this.player = new PlayerState(
      this.runState.playerHp,
      this.runState.playerMaxHp,
    );
    this.demon = this.add.sprite(width * 0.25, height * 0.5, "char-demon-idle");
    this.demon.setDisplaySize(384, 384);
    this.demon.play("char-demon-idle");

    const audio = getAudioManager(this);
    audio.transitionTo(this.isBossFight ? "boss" : "main");

    // Spawn enemy visuals
    const positions = enemyPositions(roster.length, width, height);
    for (let i = 0; i < roster.length; i++) {
      const { tpl } = roster[i];
      const { x, y } = positions[i];
      const vis = this.buildEnemyVisual(i, tpl, x, y);
      this.enemyVisuals.push(vis);
    }

    // Level / node label
    const kindLabel =
      node.kind === "boss"
        ? "BOSS"
        : node.kind === "elite"
          ? "Elite"
          : `Tier ${node.tier}`;
    this.add
      .text(width * 0.74, height * 0.18, kindLabel, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "17px",
        color: "#e0c060",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(10);

    // Player HP bar
    this.playerHpBar = new HpBar(this, width * 0.1, height * 0.9, 200, 24);
    this.playerHpBar.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
    this.playerHpBar.setPercent(this.player.hpPercent);
    this.playerHpBar.setDepth(10);

    // Shield display
    this.shieldIcon = this.add.image(
      width * 0.1 + 115,
      height * 0.9,
      "icon-shield",
    );
    this.shieldIcon
      .setDisplaySize(20, 20)
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);
    this.shieldText = this.add
      .text(width * 0.1 + 130, height * 0.9, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#66ccff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setDepth(10);

    // Hand & End Turn
    this.handUI = new HandUI(this, (card) => this.onCardSelected(card));

    const btnW = 180;
    const btnH = 44;
    const btnX = width - btnW / 2 - 20;
    const btnY = height - btnH / 2 - 8;

    const btnBg = this.add.graphics().setDepth(19);
    btnBg.fillStyle(0x8b0000, 0.9);
    btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
    btnBg.lineStyle(2, 0xd4a040, 1);
    btnBg.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);

    this.endTurnBtn = this.add
      .text(btnX, btnY, "End Turn", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);
    this.endTurnBtn.on("pointerover", () => {
      this.endTurnBtn.setColor("#ffd700");
      btnBg.clear();
      btnBg.fillStyle(0xaa1111, 1);
      btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
      btnBg.lineStyle(2, 0xffd700, 1);
      btnBg.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
    });
    this.endTurnBtn.on("pointerout", () => {
      this.endTurnBtn.setColor("#ffffff");
      btnBg.clear();
      btnBg.fillStyle(0x8b0000, 0.9);
      btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
      btnBg.lineStyle(2, 0xd4a040, 1);
      btnBg.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
    });
    this.endTurnBtn.on("pointerdown", () => this.endPlayerTurn());

    // Store btnBg for disposal later
    (this.endTurnBtn as any)._btnBg = btnBg;

    this.combo = new Combo();
    this.comboHud = new ComboHud(this);
    this.deck = new DeckState(this.runState.deck);
    this.startPlayerTurn();
  }

  // ─── Enemy visual builder ───────────────────────────────────────────────────

  private buildEnemyVisual(
    _index: number,
    tpl: EnemyTemplate,
    x: number,
    y: number,
  ): EnemyVisual {
    const animKey = tpl.isStatic ? tpl.spriteKey : `enemy-${tpl.spriteKey}`;
    const displayH = tpl.displaySize;
    const displayW = tpl.displayW ?? tpl.displaySize;
    const half = displayH / 2;

    const sprite = this.add.sprite(
      x,
      y,
      tpl.isStatic ? tpl.spriteKey : `${animKey}-idle`,
    );
    sprite.setDisplaySize(displayW, displayH);
    if (tpl.isStatic) {
      sprite.setFlipX(false);
    } else {
      sprite.setFlipX(true);
      sprite.play(`${animKey}-idle`);
    }
    sprite.setDepth(8);

    const enemyState = this.enemyGroup.enemies[this.enemyVisuals.length]!;

    // HP bar and name below sprite
    const barY = y + half + 16;
    const hpBar = new HpBar(this, x, barY, 130, 14);
    hpBar.setText(`${enemyState.hp}/${enemyState.maxHp}`);
    hpBar.setPercent(enemyState.hpPercent);
    hpBar.setDepth(10);

    const nameLabel = this.add
      .text(x, barY - 18, tpl.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        color: "#dddddd",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(10);

    // Intent text above sprite
    const intentText = this.add
      .text(x, y - half - 12, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#ff9999",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(11);

    // Highlight ring
    const ring = this.add.graphics().setDepth(9);
    ring.lineStyle(4, 0xffff44, 1);
    ring.strokeCircle(x, y, half + 8);
    ring.setVisible(false);

    // Burn stack counter below name
    const burnText = this.add
      .text(x, barY - 32, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#ff8800",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(11);

    return {
      sprite,
      hpBar,
      intentText,
      nameLabel,
      highlightRing: ring,
      burnText,
      animKey,
      tpl,
      x,
      y,
    };
  }

  // ─── Turn management ────────────────────────────────────────────────────────

  private startPlayerTurn(): void {
    this.playerTurn = true;
    this.endTurnBtn.setAlpha(1);
    const btnBg = (this.endTurnBtn as any)
      ._btnBg as Phaser.GameObjects.Graphics;
    if (btnBg) btnBg.setAlpha(1);
    this.player.clearShield();
    this.updateShieldDisplay();
    this.combo.reset();
    this.comboHud.hide();
    this.computeAndShowIntents();
    this.drawHand();
  }

  private computeAndShowIntents(): void {
    const bossPhase2 =
      this.isBossFight &&
      (this.enemyGroup.enemies[0]?.hp ?? 999) < 40;
    const ascDmg = this.runState.ascension >= 1 ? 1 : 0;
    this.enemyGroup.computeIntents(bossPhase2, ascDmg);

    for (let i = 0; i < this.enemyVisuals.length; i++) {
      const state = this.enemyGroup.enemies[i];
      const vis = this.enemyVisuals[i];
      if (!state || !state.isAlive) {
        vis.intentText.setText("");
        continue;
      }
      const intent = state.intent;
      if (intent.kind === "attack") {
        vis.intentText.setText(`ATK ${intent.damage}`).setColor("#ff9999");
      } else if (intent.kind === "defend") {
        vis.intentText.setText(`DEF ${intent.block}`).setColor("#99ccff");
      } else {
        vis.intentText.setText("BUFF").setColor("#cc99ff");
      }
    }
  }

  private drawHand(): void {
    this.deck.draw(5);
    this.refreshHand();
  }

  private refreshHand(): void {
    const canAfford = this.deck.hand.map((c) => canPlayCard(c, this.player));
    this.handUI.show(this.deck.hand, canAfford, this.combo.nextCost);
  }

  // ─── Card targeting ─────────────────────────────────────────────────────────

  private onCardSelected(card: Card): void {
    if (!this.playerTurn || this.pendingCard) return;
    if (!canPlayCard(card, this.player)) return;

    const living = this.enemyGroup.living;

    if (
      card.targeting === "self" ||
      card.targeting === "aoe" ||
      living.length <= 1
    ) {
      const targets = card.targeting === "self" ? [] : living;
      this.executeCard(card, targets);
    } else {
      // Enter targeting mode: player must click an enemy
      this.enterTargetingMode(card);
    }
  }

  private enterTargetingMode(card: Card): void {
    this.pendingCard = card;
    this.handUI.clear();

    const { width, height } = this.scale;
    this.cancelBtn = this.add
      .text(width - 80, height - 60, "[ Cancel ]", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(25);
    this.cancelBtn.on("pointerdown", () => this.exitTargetingMode());

    for (let i = 0; i < this.enemyVisuals.length; i++) {
      const state = this.enemyGroup.enemies[i];
      if (!state) continue;
      const vis = this.enemyVisuals[i];
      vis.highlightRing.setVisible(true);
      vis.sprite.setInteractive({ useHandCursor: true });
      vis.sprite.on("pointerdown", () => this.fireAtEnemy(i));
      vis.sprite.on("pointerover", () => vis.highlightRing.setAlpha(1.6));
      vis.sprite.on("pointerout", () => vis.highlightRing.setAlpha(1));
    }
  }

  private exitTargetingMode(): void {
    this.pendingCard = null;
    this.cancelBtn?.destroy();
    this.cancelBtn = null;

    for (const vis of this.enemyVisuals) {
      vis.highlightRing.setVisible(false);
      vis.sprite.removeAllListeners("pointerdown");
      vis.sprite.removeAllListeners("pointerover");
      vis.sprite.removeAllListeners("pointerout");
      vis.sprite.disableInteractive();
    }
    this.refreshHand();
  }

  private fireAtEnemy(index: number): void {
    const card = this.pendingCard;
    if (!card) return;
    this.exitTargetingMode();
    const target = this.enemyGroup.enemies[index];
    if (!target) return;
    this.executeCard(card, [target]);
  }

  // ─── Card execution ──────────────────────────────────────────────────────────

  private executeCard(card: Card, targets: EnemyState[]): void {
    const comboResult = this.combo.recordPlay(card.cost);
    const comboBonus = comboResult.advanced ? 1 : 0;

    this.player.payCost(card.cost);
    const result = applyCardEffect(card, this.player, targets, comboBonus);
    this.deck.discard(card);

    const audio = getAudioManager(this);
    audio.playSfx(this, "sfx-attack-soft");

    if (result.damageDealt > 0) {
      for (let i = 0; i < this.enemyVisuals.length; i++) {
        const state = this.enemyGroup.enemies[i];
        if (!state) continue;
        if (targets.includes(state)) {
          const vis = this.enemyVisuals[i];
          this.flashSprite(vis.sprite, 0xff0000);
          this.updateEnemyHpBar(i);
          this.floatDamageNumber(
            vis.sprite.x,
            vis.sprite.y - vis.tpl.displaySize / 2,
            result.damageDealt,
            comboResult.advanced,
          );
        }
      }
      this.cameras.main.shake(80, 0.003);
    }

    if (result.healAmount > 0) {
      this.flashSprite(this.demon, 0x00ff00);
      this.healVfx(this.demon.x, this.demon.y);
      audio.playSfx(this, "sfx-attack-fire");
      this.floatHealNumber(this.demon.x, this.demon.y - 192, result.healAmount);
    }

    if (result.blockGained > 0) {
      this.blockVfx(this.demon.x, this.demon.y);
      audio.playSfx(this, "sfx-attack-fire");
      this.floatBlockNumber(
        this.demon.x,
        this.demon.y - 192,
        result.blockGained,
      );
    }

    if (comboResult.advanced) {
      const pos = this.handUI.lastPlayedPosition;
      this.goldBurst(pos.x, pos.y);
    }
    this.comboHud.show(this.combo.tier);

    if (result.cardsDrawn > 0) {
      this.deck.draw(result.cardsDrawn);
      audio.playSfx(this, "sfx-ui-booster");
    }

    if (result.burnApplied > 0) {
      for (let i = 0; i < this.enemyVisuals.length; i++) {
        const state = this.enemyGroup.enemies[i];
        if (!state) continue;
        if (targets.includes(state)) {
          this.updateEnemyBurnDisplay(i);
        }
      }
      audio.playSfx(this, "sfx-attack-fire");
    }

    this.playerHpBar.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
    this.playerHpBar.setPercent(this.player.hpPercent);
    this.updateShieldDisplay();

    // Card pop effect
    if (this.handUI.lastPlayedPosition) {
      this.cardPopEffect(
        this.handUI.lastPlayedPosition.x,
        this.handUI.lastPlayedPosition.y,
      );
    }

    // Check each target for death
    this.checkEnemyDeaths();

    if (this.enemyGroup.allDead()) {
      this.onVictory();
    } else if (this.player.hp <= 0) {
      this.onDefeat();
    } else {
      this.refreshHand();
      if (this.deck.hand.length === 0) this.endPlayerTurn();
    }
  }

  private updateEnemyHpBar(index: number): void {
    const state = this.enemyGroup.enemies[index];
    const vis = this.enemyVisuals[index];
    if (!state) return;
    vis.hpBar.setText(`${state.hp}/${state.maxHp}`);
    vis.hpBar.setPercent(state.hpPercent);
  }

  private updateEnemyBurnDisplay(index: number): void {
    const state = this.enemyGroup.enemies[index];
    const vis = this.enemyVisuals[index];
    if (!state) return;
    if (state.burnStacks > 0) {
      vis.burnText.setText(`${state.burnStacks} burn`).setVisible(true);
    } else {
      vis.burnText.setVisible(false);
    }
  }

  private checkEnemyDeaths(): void {
    for (let i = 0; i < this.enemyVisuals.length; i++) {
      const state = this.enemyGroup.enemies[i];
      if (state === null) continue; // already killed this fight
      if (state.hp <= 0) {
        this.killEnemy(i);
      }
    }
  }

  private killEnemy(index: number): void {
    const vis = this.enemyVisuals[index];
    this.enemyGroup.kill(index);

    if (vis.tpl.isStatic) {
      this.tweens.add({
        targets: vis.sprite,
        alpha: 0,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 700,
        ease: "Power2",
      });
    } else {
      vis.sprite.play(`${vis.animKey}-death`);
      vis.sprite.once("animationcomplete", () => {
        if (vis.sprite.active) vis.sprite.setVisible(false);
      });
    }
    vis.hpBar.setVisible(false);
    vis.nameLabel.setVisible(false);
    vis.intentText.setVisible(false);
    vis.burnText.setVisible(false);
    vis.highlightRing.setVisible(false);
  }

  // ─── End turn & enemy turn ───────────────────────────────────────────────────

  private endPlayerTurn(): void {
    if (!this.playerTurn) return;
    this.playerTurn = false;
    this.endTurnBtn.setAlpha(0.4);
    const btnBg = (this.endTurnBtn as any)
      ._btnBg as Phaser.GameObjects.Graphics;
    if (btnBg) btnBg.setAlpha(0.3);
    this.handUI.clear();
    this.deck.discardAll();
    this.time.delayedCall(600, () => this.runEnemyTurns());
  }

  private runEnemyTurns(): void {
    this.processBurnTicks();
    if (this.enemyGroup.allDead()) {
      this.onVictory();
      return;
    }
    const entries = this.enemyGroup.livingWithIndices;
    this.doNextEnemyTurn(entries, 0);
  }

  private processBurnTicks(): void {
    for (let i = 0; i < this.enemyGroup.enemies.length; i++) {
      const enemy = this.enemyGroup.enemies[i];
      if (!enemy || !enemy.isAlive || enemy.burnStacks <= 0) continue;
      const tickDmg = enemy.burnStacks;
      if (tickDmg > 0) {
        enemy.takeDamage(tickDmg);
        const vis = this.enemyVisuals[i];
        this.burnFireVfx(vis.sprite.x, vis.sprite.y);
        this.floatDamageNumber(vis.sprite.x, vis.sprite.y - vis.tpl.displaySize / 2, tickDmg, false);
      }
      this.updateEnemyHpBar(i);
      if (enemy.hp <= 0) {
        this.killEnemy(i);
      } else {
        this.updateEnemyBurnDisplay(i);
      }
    }
  }

  private doNextEnemyTurn(
    entries: { enemy: EnemyState; index: number }[],
    idx: number,
  ): void {
    if (idx >= entries.length) {
      this.time.delayedCall(300, () => this.startPlayerTurn());
      return;
    }

    if (this.player.hp <= 0) return;

    const { enemy, index } = entries[idx];
    const vis = this.enemyVisuals[index];
    const intent = enemy.intent;

    const advance = () =>
      this.time.delayedCall(400, () => this.doNextEnemyTurn(entries, idx + 1));

    if (intent.kind === "attack") {
      const dmg = intent.damage;
      if (vis.tpl.isStatic) {
        // Phase 2 enrage swap at low HP
        if (vis.tpl.phase2Key && enemy.hp < enemy.maxHp * 0.4) {
          vis.sprite.setTexture(vis.tpl.phase2Key);
          vis.sprite.setDisplaySize(
            vis.tpl.displayW ?? vis.tpl.displaySize,
            vis.tpl.displaySize,
          );
        }
        this.flashSprite(vis.sprite, 0xff2200);
        this.time.delayedCall(500, () => {
          this.dealEnemyDamage(dmg);
          if (this.player.hp <= 0) {
            this.onDefeat();
            return;
          }
          advance();
        });
      } else {
        vis.sprite.play(`${vis.animKey}-attack`);
        vis.sprite.once("animationcomplete", () => {
          vis.sprite.play(`${vis.animKey}-idle`);
          this.dealEnemyDamage(dmg);
          if (this.player.hp <= 0) {
            this.onDefeat();
            return;
          }
          advance();
        });
      }
    } else {
      advance();
    }
  }

  private dealEnemyDamage(damage: number): void {
    const audio = getAudioManager(this);
    audio.playSfx(this, "sfx-player-damage");
    this.player.takeDamage(damage);
    this.flashSprite(this.demon, 0xff0000);
    this.playerHpBar.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
    this.playerHpBar.setPercent(this.player.hpPercent);
    this.updateShieldDisplay();
    this.cameras.main.shake(120, 0.005);
  }

  // ─── Victory / defeat ────────────────────────────────────────────────────────

  private onVictory(): void {
    this.handUI.clear();
    this.runState.playerHp = this.player.hp;
    this.runState.markNodeCleared(this.activeNodeId);

    if (this.isBossFight) {
      unlockNextAscension();
    }

    this.registry.set("runState", this.runState);

    const audio = getAudioManager(this);
    if (this.isBossFight) {
      audio.playSfx(this, "sting-win");
      this.time.delayedCall(800, () =>
        this.showEndScreen("screen-victory", true),
      );
    } else {
      this.time.delayedCall(800, () => this.scene.start("RewardScene"));
    }
  }

  private onDefeat(): void {
    this.handUI.clear();
    this.demon.play("char-demon-death");
    const audio = getAudioManager(this);
    audio.playSfx(this, "sting-game-over");
    this.time.delayedCall(1200, () => this.showEndScreen("screen-loss", false));
  }

  private showEndScreen(_key: string, isVictory: boolean): void {
    const { width, height } = this.scale;

    const overlay = this.add.graphics().setDepth(50);
    overlay.fillGradientStyle(
      isVictory ? 0x1a1200 : 0x1a0000,
      isVictory ? 0x1a1200 : 0x1a0000,
      0x000000,
      0x000000,
      0.92,
    );
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );

    const label = isVictory ? "Victory!" : "Defeated";
    const color = isVictory ? "#ffd700" : "#ff4444";
    this.add
      .text(width / 2, height * 0.4, label, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "68px",
        color,
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(60);

    this.add
      .text(width / 2, height * 0.58, "[ Click to continue ]", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5)
      .setDepth(60);

    overlay.on("pointerdown", () => {
      const audio = getAudioManager(this);
      audio.stopAll();
      this.scene.start("TitleScene");
    });
  }

  // ─── VFX helpers ─────────────────────────────────────────────────────────────

  private updateShieldDisplay(): void {
    if (this.player.shield > 0) {
      this.shieldIcon.setVisible(true);
      this.shieldText.setText(`${this.player.shield}`);
    } else {
      this.shieldIcon.setVisible(false);
      this.shieldText.setText("");
    }
  }

  private flashSprite(
    sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
    color: number,
  ): void {
    sprite.setTint(color);
    this.time.delayedCall(150, () => sprite.clearTint());
  }

  private healVfx(x: number, y: number): void {
    const circle = this.add.graphics().setDepth(30);
    this.tweens.add({
      targets: circle,
      alpha: 0,
      duration: 500,
      onUpdate: (tween) => {
        circle.clear();
        const r = 10 + tween.progress * 50;
        circle.fillStyle(0x00ff66, 0.6 * (1 - tween.progress));
        circle.fillCircle(x, y, r);
      },
      onComplete: () => circle.destroy(),
    });
  }

  private blockVfx(x: number, y: number): void {
    const circle = this.add.graphics().setDepth(30);
    this.tweens.add({
      targets: circle,
      alpha: 0,
      duration: 600,
      onUpdate: (tween) => {
        circle.clear();
        const r = 15 + tween.progress * 40;
        circle.fillStyle(0x6644cc, 0.5 * (1 - tween.progress));
        circle.fillCircle(x, y, r);
      },
      onComplete: () => circle.destroy(),
    });
  }

  private goldBurst(x: number, y: number): void {
    const circle = this.add.graphics().setDepth(35);
    this.tweens.add({
      targets: circle,
      alpha: 0,
      duration: 400,
      onUpdate: (tween) => {
        circle.clear();
        const r = 8 + tween.progress * 30;
        circle.fillStyle(0xffd700, 0.7 * (1 - tween.progress));
        circle.fillCircle(x, y, r);
      },
      onComplete: () => circle.destroy(),
    });
  }

  private floatDamageNumber(
    x: number,
    y: number,
    amount: number,
    isCombo: boolean,
  ): void {
    const color = isCombo ? "#ffd700" : "#ff6666";
    const label = `-${amount}`;
    const txt = this.add
      .text(x, y, label, {
        fontFamily: "system-ui, sans-serif",
        fontSize: isCombo ? "22px" : "18px",
        color,
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(40);

    this.tweens.add({
      targets: txt,
      y: y - 60,
      alpha: 0,
      duration: 900,
      ease: "Power1",
      onComplete: () => txt.destroy(),
    });
  }

  private floatHealNumber(x: number, y: number, amount: number): void {
    const txt = this.add
      .text(x, y, `+${amount}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#66ff66",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(40);

    this.tweens.add({
      targets: txt,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: "Power1",
      onComplete: () => txt.destroy(),
    });
  }

  private floatBlockNumber(x: number, y: number, amount: number): void {
    const txt = this.add
      .text(x, y, `+${amount}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#66ccff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(40);

    this.tweens.add({
      targets: txt,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: "Power1",
      onComplete: () => txt.destroy(),
    });
  }

  private cardPopEffect(x: number, y: number): void {
    const pop = this.add
      .text(x, y, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "24px",
      })
      .setOrigin(0.5)
      .setDepth(45)
      .setAlpha(0);

    this.tweens.add({
      targets: pop,
      scaleX: { from: 0.5, to: 1.5 },
      scaleY: { from: 0.5, to: 1.5 },
      alpha: { from: 0.6, to: 0 },
      duration: 350,
      ease: "Power2",
      onComplete: () => pop.destroy(),
    });
  }

  private burnFireVfx(x: number, y: number): void {
    if (!this.anims.exists("vfx-fire-burn")) return;
    const fire = this.add.sprite(x, y, "vfx-fire-burn");
    fire.setDisplaySize(128, 128).setDepth(35);
    fire.play("vfx-fire-burn");
    fire.once("animationcomplete", () => fire.destroy());
  }
}
