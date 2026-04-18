import * as Phaser from 'phaser';
import { HERO_CLASSES } from '../data/classes';
import { ENEMIES, EnemyDef } from '../data/enemies';
import { SPELLS, SpellDef } from '../data/spells';
import type { BattleActor, BattleAction, BattleState, ActionType } from '../types/battle';

// ── Layout constants ──────────────────────────────────────
const W = 1920;
const H = 1080;
const HUD_H = 260;         // bottom panel height
const BATTLE_H = H - HUD_H; // 820px for battle area

const FONT = 'monospace';
const WHITE = '#ffffff';
const YELLOW = '#ffdd88';
const GREY = '#aaaaaa';
const GREEN = '#44ff66';
const RED = '#ff4444';
const BLUE = '#4488ff';

interface PartyMember {
  classId: string;
  name: string;
  level: number;
  xp: number;
  currentHp: number;
  currentMp: number;
  stats: { hp: number; mp: number; atk: number; def: number; mag: number; spd: number };
}

export class BattleScene extends Phaser.Scene {
  // State machine
  private state: BattleState = 'COMMAND_SELECT';
  private currentPartyIndex = 0;   // which hero is choosing
  private menuIndex = 0;           // command menu cursor
  private targetIndex = 0;         // target selection cursor
  private magicIndex = 0;          // spell selection cursor

  // Data
  private partyActors: BattleActor[] = [];
  private enemyActors: BattleActor[] = [];
  private turnActions: BattleAction[] = [];
  private allActors: BattleActor[] = [];

  // Sprites
  private heroSprites: (Phaser.GameObjects.Sprite | Phaser.GameObjects.Image)[] = [];
  private enemySprites: Phaser.GameObjects.Sprite[] = [];

  // HUD elements
  private partyRows: {
    nameText: Phaser.GameObjects.Text;
    hpBar: Phaser.GameObjects.Rectangle;
    hpBarBg: Phaser.GameObjects.Rectangle;
    mpBar: Phaser.GameObjects.Rectangle;
    mpBarBg: Phaser.GameObjects.Rectangle;
    hpText: Phaser.GameObjects.Text;
  }[] = [];

  private commandTexts: Phaser.GameObjects.Text[] = [];
  private commandCursor!: Phaser.GameObjects.Text;
  private targetCursor!: Phaser.GameObjects.Image;
  private magicTexts: Phaser.GameObjects.Text[] = [];
  private magicContainer!: Phaser.GameObjects.Container;
  private currentHeroIndicator!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  private music!: Phaser.Sound.BaseSound;
  private availableSpells: SpellDef[] = [];

  constructor() {
    super('BattleScene');
  }

  create(data: { enemies: string[] }): void {
    this.state = 'COMMAND_SELECT';
    this.currentPartyIndex = 0;
    this.menuIndex = 0;
    this.turnActions = [];

    // ── Build actors ──────────────────────────────────────
    this.buildActors(data.enemies);

    // ── Battle background ─────────────────────────────────
    // Dark fill behind everything
    this.add.rectangle(W / 2, BATTLE_H / 2, W, BATTLE_H, 0x0a0a12).setDepth(0);
    if (this.textures.exists('fight_bg')) {
      // Scale to fit width while keeping aspect ratio, anchored to bottom
      const bg = this.add.image(W / 2, BATTLE_H, 'fight_bg');
      const scale = W / bg.width;
      bg.setScale(scale);
      bg.setOrigin(0.5, 1); // anchor bottom-center
      bg.setDepth(0.5);
    }

    // ── Place enemy sprites (left side) ───────────────────
    this.placeEnemySprites();

    // ── Place hero sprites (right side) ───────────────────
    this.placeHeroSprites();

    // ── Bottom HUD panel ──────────────────────────────────
    this.add.rectangle(W / 2, H - HUD_H / 2, W, HUD_H, 0x111122).setDepth(50);
    this.add.rectangle(W / 2, H - HUD_H, W, 4, 0x445577).setDepth(51);

    this.buildPartyHUD();
    this.buildCommandMenu();
    this.buildTargetCursor();
    this.buildMagicMenu();
    this.buildMessageText();

    // ── Input ─────────────────────────────────────────────
    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.handleInput('up'));
    kb.on('keydown-DOWN', () => this.handleInput('down'));
    kb.on('keydown-LEFT', () => this.handleInput('left'));
    kb.on('keydown-RIGHT', () => this.handleInput('right'));
    kb.on('keydown-ENTER', () => this.handleInput('confirm'));
    kb.on('keydown-BACKSPACE', () => this.handleInput('cancel'));
    kb.on('keydown-ESC', () => this.handleInput('cancel'));

    // ── Music ─────────────────────────────────────────────
    this.music = this.sound.add('music_battle', { loop: true, volume: 0.5 });
    this.music.play();

    // ── Fade in ───────────────────────────────────────────
    this.cameras.main.fadeIn(300);

    // Start with first hero's command
    this.beginCommandSelect();
  }

  // ════════════════════════════════════════════════════════
  //  ACTOR SETUP
  // ════════════════════════════════════════════════════════

  private buildActors(enemyIds: string[]): void {
    const party = this.registry.get('party') as PartyMember[];

    this.partyActors = party.map((pm, i) => {
      const cls = HERO_CLASSES.find(c => c.id === pm.classId)!;
      const frameSize = cls.battleSpritePrefix === 'mage' ? 128 : 192;
      return {
        id: `hero_${i}`,
        name: pm.name,
        isEnemy: false,
        hp: pm.currentHp,
        maxHp: pm.stats.hp,
        mp: pm.currentMp,
        maxMp: pm.stats.mp,
        atk: pm.stats.atk,
        def: pm.stats.def,
        mag: pm.stats.mag,
        spd: pm.stats.spd,
        spriteKey: `${cls.battleSpritePrefix}_idle`,
        frameSize,
        alive: pm.currentHp > 0,
        defending: false,
        index: i,
      };
    });

    this.enemyActors = enemyIds.map((eid, i) => {
      const def = ENEMIES[eid];
      return {
        id: `enemy_${i}`,
        name: def.name,
        isEnemy: true,
        hp: def.hp,
        maxHp: def.hp,
        mp: 0,
        maxMp: 0,
        atk: def.atk,
        def: def.def,
        mag: def.mag,
        spd: def.spd,
        spriteKey: `${def.spritePrefix}_idle`,
        frameSize: def.frameSize,
        alive: true,
        defending: false,
        index: i,
      };
    });

    this.allActors = [...this.partyActors, ...this.enemyActors];
  }

  // ════════════════════════════════════════════════════════
  //  SPRITE PLACEMENT
  // ════════════════════════════════════════════════════════

  private placeEnemySprites(): void {
    this.enemySprites = [];
    const count = this.enemyActors.length;
    // Enemies stacked vertically on the left, in the middle-lower area
    const startY = BATTLE_H * 0.35;
    const spacing = Math.min(160, (BATTLE_H * 0.55) / count);

    for (let i = 0; i < count; i++) {
      const actor = this.enemyActors[i];
      const x = 340;
      const y = startY + i * spacing;
      const key = actor.spriteKey;

      let sprite: Phaser.GameObjects.Sprite;
      if (this.textures.exists(key)) {
        sprite = this.add.sprite(x, y, key, 0);
        const scale = 80 / actor.frameSize;
        sprite.setScale(scale);

        // Register idle anim
        const animKey = `battle_${actor.id}_idle`;
        if (!this.anims.exists(animKey)) {
          const total = this.textures.get(key).frameTotal - 1;
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(key, { start: 0, end: total - 1 }),
            frameRate: 6, repeat: -1,
          });
        }
        sprite.anims.play(animKey);
      } else {
        // Fallback colored rectangle
        sprite = this.add.sprite(x, y, '__DEFAULT');
        this.add.rectangle(x, y, 80, 80, 0xcc4444).setDepth(5);
      }

      sprite.setDepth(5);
      // Subtle idle bounce
      this.tweens.add({
        targets: sprite, y: y - 4, duration: 1200,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: i * 200,
      });

      // Enemy name above sprite
      this.add.text(x, y - 55, actor.name, {
        fontFamily: FONT, fontSize: '20px', color: WHITE,
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(6);

      this.enemySprites.push(sprite);
    }
  }

  private placeHeroSprites(): void {
    this.heroSprites = [];
    const party = this.registry.get('party') as PartyMember[];
    const count = this.partyActors.length;
    // Heroes stacked vertically on the right, matching enemy layout
    const startY = BATTLE_H * 0.35;
    const spacing = Math.min(140, (BATTLE_H * 0.55) / count);

    for (let i = 0; i < count; i++) {
      const actor = this.partyActors[i];
      const cls = HERO_CLASSES.find(c => c.id === party[i].classId)!;
      const portraitKey = cls.portraitKey;
      const x = W - 340;
      const y = startY + i * spacing;

      let img: Phaser.GameObjects.Image;
      if (this.textures.exists(portraitKey)) {
        img = this.add.image(x, y, portraitKey);
        // Portraits ~96x110, scale to ~75px tall
        const tex = this.textures.get(portraitKey).getSourceImage();
        img.setScale(75 / tex.height);
      } else {
        img = this.add.image(x, y, '__DEFAULT');
        this.add.rectangle(x, y, 60, 60, 0x4488cc).setDepth(5);
      }

      img.setDepth(5);
      this.tweens.add({
        targets: img, y: y - 3, duration: 1400,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: i * 150,
      });

      this.heroSprites.push(img);
    }
  }

  // ════════════════════════════════════════════════════════
  //  HUD
  // ════════════════════════════════════════════════════════

  private buildPartyHUD(): void {
    this.partyRows = [];
    const baseX = 60;
    const baseY = H - HUD_H + 30;
    const rowH = 55;
    const barW = 240;
    const barH = 16;

    for (let i = 0; i < this.partyActors.length; i++) {
      const actor = this.partyActors[i];
      const y = baseY + i * rowH;

      const nameText = this.add.text(baseX, y, actor.name, {
        fontFamily: FONT, fontSize: '22px', color: YELLOW,
      }).setDepth(52);

      // HP bar
      const hpBarBg = this.add.rectangle(baseX + 170 + barW / 2, y + 8, barW, barH, 0x333333).setDepth(52);
      const hpFrac = actor.hp / actor.maxHp;
      const hpBar = this.add.rectangle(baseX + 170, y + 8, barW * hpFrac, barH, 0x44cc44)
        .setOrigin(0, 0.5).setDepth(53);
      const hpText = this.add.text(baseX + 170 + barW + 10, y + 1, `${actor.hp}/${actor.maxHp}`, {
        fontFamily: FONT, fontSize: '18px', color: WHITE,
      }).setDepth(52);

      // MP bar
      const mpBarBg = this.add.rectangle(baseX + 170 + barW / 2, y + 28, barW, 10, 0x222244).setDepth(52);
      const mpFrac = actor.maxMp > 0 ? actor.mp / actor.maxMp : 0;
      const mpBar = this.add.rectangle(baseX + 170, y + 28, barW * mpFrac, 10, 0x4466cc)
        .setOrigin(0, 0.5).setDepth(53);

      this.partyRows.push({ nameText, hpBar, hpBarBg, mpBar, mpBarBg, hpText });
    }

    // Current hero indicator
    this.currentHeroIndicator = this.add.text(baseX - 30, baseY, '▶', {
      fontFamily: FONT, fontSize: '22px', color: YELLOW,
    }).setDepth(52);
  }

  private refreshHUD(): void {
    const barW = 240;
    for (let i = 0; i < this.partyActors.length; i++) {
      const actor = this.partyActors[i];
      const row = this.partyRows[i];
      const hpFrac = Math.max(0, actor.hp / actor.maxHp);
      row.hpBar.width = barW * hpFrac;
      row.hpBar.setFillStyle(hpFrac > 0.3 ? 0x44cc44 : 0xcc4444);
      row.hpText.setText(`${Math.max(0, actor.hp)}/${actor.maxHp}`);

      const mpFrac = actor.maxMp > 0 ? Math.max(0, actor.mp / actor.maxMp) : 0;
      row.mpBar.width = barW * mpFrac;

      // Grey out dead heroes
      row.nameText.setColor(actor.alive ? YELLOW : '#555555');
    }
  }

  private buildCommandMenu(): void {
    const menuX = W - 500;
    const menuY = H - HUD_H + 30;
    const commands = ['Attack', 'Magic', 'Defend'];

    this.commandTexts = commands.map((label, i) => {
      return this.add.text(menuX + 40, menuY + i * 50, label, {
        fontFamily: FONT, fontSize: '28px', color: WHITE,
      }).setDepth(52);
    });

    this.commandCursor = this.add.text(menuX, menuY, '▶', {
      fontFamily: FONT, fontSize: '28px', color: YELLOW,
    }).setDepth(52);
  }

  private buildTargetCursor(): void {
    if (this.textures.exists('cursor')) {
      this.targetCursor = this.add.image(0, 0, 'cursor').setScale(0.8).setDepth(20).setVisible(false);
    } else {
      // Fallback: use a sprite placeholder
      this.targetCursor = this.add.image(0, 0, '__DEFAULT').setDepth(20).setVisible(false);
    }
  }

  private buildMagicMenu(): void {
    this.magicContainer = this.add.container(W - 500, H - HUD_H - 200).setDepth(60).setVisible(false);

    // Background
    this.magicContainer.add(
      this.add.rectangle(150, 80, 300, 200, 0x111133, 0.95).setStrokeStyle(2, 0x445577)
    );

    this.magicTexts = [];
  }

  private buildMessageText(): void {
    this.messageText = this.add.text(W / 2, BATTLE_H / 2, '', {
      fontFamily: FONT, fontSize: '42px', color: WHITE,
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(100).setVisible(false);
  }

  // ════════════════════════════════════════════════════════
  //  INPUT HANDLING
  // ════════════════════════════════════════════════════════

  private handleInput(dir: string): void {
    if (this.state === 'COMMAND_SELECT') this.handleCommandInput(dir);
    else if (this.state === 'TARGET_SELECT') this.handleTargetInput(dir);
    else if (this.state === 'MAGIC_SELECT') this.handleMagicInput(dir);
    else if (this.state === 'VICTORY' || this.state === 'DEFEAT') {
      if (dir === 'confirm') this.endBattle();
    }
  }

  private handleCommandInput(dir: string): void {
    if (dir === 'up') {
      this.menuIndex = (this.menuIndex - 1 + 3) % 3;
    } else if (dir === 'down') {
      this.menuIndex = (this.menuIndex + 1) % 3;
    } else if (dir === 'confirm') {
      const cmd = ['attack', 'magic', 'defend'][this.menuIndex] as ActionType;
      if (cmd === 'attack') {
        this.state = 'TARGET_SELECT';
        this.targetIndex = this.firstAliveEnemyIndex();
        this.showTargetCursor(true);
      } else if (cmd === 'magic') {
        this.openMagicMenu();
      } else if (cmd === 'defend') {
        this.pushAction({ actorId: this.currentHero().id, type: 'defend' });
        this.advancePartyCommand();
      }
    } else if (dir === 'cancel' && this.turnActions.length > 0) {
      // Go back to previous hero
      this.turnActions.pop();
      this.currentPartyIndex = Math.max(0, this.currentPartyIndex - 1);
      while (this.currentPartyIndex > 0 && !this.partyActors[this.currentPartyIndex].alive) {
        this.currentPartyIndex--;
      }
      this.updateHeroIndicator();
    }
    this.updateCommandCursor();
  }

  private handleTargetInput(dir: string): void {
    const alive = this.enemyActors.filter(e => e.alive);
    if (alive.length === 0) return;

    if (dir === 'up' || dir === 'left') {
      this.targetIndex = (this.targetIndex - 1 + this.enemyActors.length) % this.enemyActors.length;
      while (!this.enemyActors[this.targetIndex].alive) {
        this.targetIndex = (this.targetIndex - 1 + this.enemyActors.length) % this.enemyActors.length;
      }
    } else if (dir === 'down' || dir === 'right') {
      this.targetIndex = (this.targetIndex + 1) % this.enemyActors.length;
      while (!this.enemyActors[this.targetIndex].alive) {
        this.targetIndex = (this.targetIndex + 1) % this.enemyActors.length;
      }
    } else if (dir === 'confirm') {
      const hero = this.currentHero();
      const pending = this.pendingSpellId;
      if (pending) {
        this.pushAction({ actorId: hero.id, type: 'magic', targetId: this.enemyActors[this.targetIndex].id, spellId: pending });
        this.pendingSpellId = undefined;
      } else {
        this.pushAction({ actorId: hero.id, type: 'attack', targetId: this.enemyActors[this.targetIndex].id });
      }
      this.showTargetCursor(false);
      this.advancePartyCommand();
    } else if (dir === 'cancel') {
      this.pendingSpellId = undefined;
      this.showTargetCursor(false);
      this.state = 'COMMAND_SELECT';
    }
    this.updateTargetCursor();
  }

  private pendingSpellId?: string;

  private handleMagicInput(dir: string): void {
    if (this.availableSpells.length === 0) return;

    if (dir === 'up') {
      this.magicIndex = (this.magicIndex - 1 + this.availableSpells.length) % this.availableSpells.length;
    } else if (dir === 'down') {
      this.magicIndex = (this.magicIndex + 1) % this.availableSpells.length;
    } else if (dir === 'confirm') {
      const spell = this.availableSpells[this.magicIndex];
      const hero = this.currentHero();
      if (hero.mp < spell.mpCost) return; // Not enough MP

      this.magicContainer.setVisible(false);

      if (spell.target === 'enemy') {
        this.pendingSpellId = spell.id;
        this.state = 'TARGET_SELECT';
        this.targetIndex = this.firstAliveEnemyIndex();
        this.showTargetCursor(true);
        this.updateTargetCursor();
      } else {
        // Ally target — auto-target self for now
        this.pushAction({
          actorId: hero.id, type: 'magic',
          targetId: hero.id, spellId: spell.id,
        });
        this.advancePartyCommand();
      }
    } else if (dir === 'cancel') {
      this.magicContainer.setVisible(false);
      this.state = 'COMMAND_SELECT';
    }
    this.updateMagicCursor();
  }

  // ════════════════════════════════════════════════════════
  //  COMMAND FLOW
  // ════════════════════════════════════════════════════════

  private beginCommandSelect(): void {
    this.state = 'COMMAND_SELECT';
    this.currentPartyIndex = 0;
    this.menuIndex = 0;
    this.turnActions = [];

    // Skip dead heroes
    while (this.currentPartyIndex < this.partyActors.length && !this.partyActors[this.currentPartyIndex].alive) {
      this.currentPartyIndex++;
    }

    this.showCommandMenu(true);
    this.updateHeroIndicator();
    this.updateCommandCursor();
  }

  private advancePartyCommand(): void {
    this.currentPartyIndex++;
    // Skip dead heroes
    while (this.currentPartyIndex < this.partyActors.length && !this.partyActors[this.currentPartyIndex].alive) {
      this.currentPartyIndex++;
    }

    if (this.currentPartyIndex >= this.partyActors.length) {
      // All commands collected → execute turn
      this.showCommandMenu(false);
      this.executeTurn();
    } else {
      this.state = 'COMMAND_SELECT';
      this.menuIndex = 0;
      this.updateHeroIndicator();
      this.updateCommandCursor();
    }
  }

  private currentHero(): BattleActor {
    return this.partyActors[this.currentPartyIndex];
  }

  private pushAction(action: BattleAction): void {
    this.turnActions.push(action);
  }

  // ════════════════════════════════════════════════════════
  //  UI UPDATES
  // ════════════════════════════════════════════════════════

  private updateCommandCursor(): void {
    const baseY = H - HUD_H + 30;
    this.commandCursor.setY(baseY + this.menuIndex * 50);
  }

  private updateHeroIndicator(): void {
    const baseY = H - HUD_H + 30;
    this.currentHeroIndicator.setY(baseY + this.currentPartyIndex * 55);
    this.currentHeroIndicator.setVisible(true);
  }

  private showCommandMenu(visible: boolean): void {
    this.commandTexts.forEach(t => t.setVisible(visible));
    this.commandCursor.setVisible(visible);
    this.currentHeroIndicator.setVisible(visible);
  }

  private showTargetCursor(visible: boolean): void {
    this.targetCursor.setVisible(visible);
    if (visible) this.updateTargetCursor();
  }

  private updateTargetCursor(): void {
    if (!this.targetCursor.visible) return;
    const sprite = this.enemySprites[this.targetIndex];
    if (sprite) {
      this.targetCursor.setPosition(sprite.x, sprite.y - 80);
    }
  }

  private openMagicMenu(): void {
    const hero = this.currentHero();
    const cls = HERO_CLASSES.find(c => `hero_${c.id}` === hero.id || hero.name === c.name);
    const abilities = cls?.abilities ?? [];
    this.availableSpells = abilities.map(id => SPELLS[id]).filter(Boolean);

    if (this.availableSpells.length === 0) {
      // No spells — flash message
      return;
    }

    this.state = 'MAGIC_SELECT';
    this.magicIndex = 0;

    // Rebuild magic menu texts
    this.magicTexts.forEach(t => t.destroy());
    this.magicTexts = [];

    this.availableSpells.forEach((spell, i) => {
      const t = this.add.text(30, 20 + i * 40, `${spell.name}  ${spell.mpCost} MP`, {
        fontFamily: FONT, fontSize: '22px',
        color: hero.mp >= spell.mpCost ? WHITE : '#555555',
      });
      this.magicContainer.add(t);
      this.magicTexts.push(t);
    });

    this.magicContainer.setVisible(true);
    this.updateMagicCursor();
  }

  private updateMagicCursor(): void {
    this.magicTexts.forEach((t, i) => {
      t.setText((i === this.magicIndex ? '▶ ' : '  ') + `${this.availableSpells[i].name}  ${this.availableSpells[i].mpCost} MP`);
    });
  }

  private firstAliveEnemyIndex(): number {
    return this.enemyActors.findIndex(e => e.alive);
  }

  // ════════════════════════════════════════════════════════
  //  TURN EXECUTION
  // ════════════════════════════════════════════════════════

  private async executeTurn(): Promise<void> {
    this.state = 'EXECUTING';

    // Reset defend flags
    this.allActors.forEach(a => (a.defending = false));

    // Enemy AI: each alive enemy attacks a random alive hero
    for (const enemy of this.enemyActors) {
      if (!enemy.alive) continue;
      const targets = this.partyActors.filter(h => h.alive);
      if (targets.length === 0) break;
      const target = targets[Phaser.Math.Between(0, targets.length - 1)];
      this.turnActions.push({ actorId: enemy.id, type: 'attack', targetId: target.id });
    }

    // Sort by SPD (descending)
    const sorted = [...this.turnActions].sort((a, b) => {
      const actorA = this.findActor(a.actorId)!;
      const actorB = this.findActor(b.actorId)!;
      return actorB.spd - actorA.spd;
    });

    // Execute each action sequentially
    for (const action of sorted) {
      const actor = this.findActor(action.actorId);
      if (!actor || !actor.alive) continue;

      if (action.type === 'attack') {
        await this.executeAttack(actor, action);
      } else if (action.type === 'magic') {
        await this.executeMagic(actor, action);
      } else if (action.type === 'defend') {
        actor.defending = true;
        await this.showFloatingText(
          this.getSpriteForActor(actor), 'DEF UP', '#88aaff'
        );
      }

      // Check for victory / defeat after each action
      if (this.enemyActors.every(e => !e.alive)) {
        await this.delay(400);
        this.handleVictory();
        return;
      }
      if (this.partyActors.every(h => !h.alive)) {
        await this.delay(400);
        this.handleDefeat();
        return;
      }
    }

    // Turn done — back to command select
    this.turnActions = [];
    this.beginCommandSelect();
  }

  private async executeAttack(actor: BattleActor, action: BattleAction): Promise<void> {
    const target = this.findActor(action.targetId!);
    if (!target || !target.alive) return;

    const attackerSprite = this.getSpriteForActor(actor);
    const targetSprite = this.getSpriteForActor(target);
    if (!attackerSprite || !targetSprite) return;

    // Attacker lunges toward target
    const origX = attackerSprite.x;
    const lungeX = actor.isEnemy ? origX + 60 : origX - 60;
    await this.tweenPromise(attackerSprite, { x: lungeX, duration: 150 });

    // Play attack SFX
    if (this.sound.get('sfx_attack_physical') || this.cache.audio.has('sfx_attack_physical')) {
      this.sound.play('sfx_attack_physical', { volume: 0.4 });
    }

    // Calculate damage
    const baseDmg = actor.atk * 2 - target.def + Phaser.Math.Between(-2, 2);
    const defMult = target.defending ? 0.5 : 1;
    const damage = Math.max(1, Math.floor(baseDmg * defMult));

    target.hp -= damage;
    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
    }

    // Flash target red
    targetSprite.setTint(0xff4444);
    await this.delay(100);
    targetSprite.clearTint();

    // Show damage number
    await this.showFloatingText(targetSprite, `-${damage}`, RED);

    // Return attacker
    await this.tweenPromise(attackerSprite, { x: origX, duration: 150 });

    // Handle death
    if (!target.alive) {
      await this.playDeath(target, targetSprite);
    }

    this.refreshHUD();
  }

  private async executeMagic(actor: BattleActor, action: BattleAction): Promise<void> {
    const spell = SPELLS[action.spellId!];
    if (!spell) return;

    actor.mp -= spell.mpCost;
    if (actor.mp < 0) actor.mp = 0;

    const target = this.findActor(action.targetId!);
    if (!target) return;

    const casterSprite = this.getSpriteForActor(actor);
    const targetSprite = this.getSpriteForActor(target);
    if (!casterSprite || !targetSprite) return;

    // Brief caster flash
    casterSprite.setTint(0x8888ff);
    await this.delay(200);
    casterSprite.clearTint();

    // SFX
    if (this.cache.audio.has('sfx_attack_magic')) {
      this.sound.play('sfx_attack_magic', { volume: 0.4 });
    }

    if (spell.effect === 'damage') {
      const baseDmg = actor.mag * 2.5 - target.def / 2 + Phaser.Math.Between(-3, 3);
      const defMult = target.defending ? 0.5 : 1;
      const damage = Math.max(1, Math.floor(baseDmg * defMult));
      target.hp -= damage;
      if (target.hp <= 0) { target.hp = 0; target.alive = false; }

      targetSprite.setTint(0xaa44ff);
      await this.delay(100);
      targetSprite.clearTint();

      const color = spell.element === 'Fire' ? '#ff6622' : spell.element === 'Ice' ? '#44aaff' : '#ffff44';
      await this.showFloatingText(targetSprite, `-${damage}`, color);

      if (!target.alive) await this.playDeath(target, targetSprite);
    } else if (spell.effect === 'heal') {
      const heal = Math.floor(actor.mag * 2 + Phaser.Math.Between(0, 5));
      target.hp = Math.min(target.maxHp, target.hp + heal);

      await this.showFloatingText(targetSprite, `+${heal}`, GREEN);
    } else if (spell.effect === 'buff_def') {
      target.def += 4;
      await this.showFloatingText(targetSprite, 'DEF+4', BLUE);
    }

    this.refreshHUD();
  }

  private async playDeath(actor: BattleActor, sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image): Promise<void> {
    if (this.cache.audio.has('sfx_unit_death')) {
      this.sound.play('sfx_unit_death', { volume: 0.3 });
    }
    await this.tweenPromise(sprite, { alpha: 0, duration: 400 });
  }

  // ════════════════════════════════════════════════════════
  //  VICTORY / DEFEAT
  // ════════════════════════════════════════════════════════

  private handleVictory(): void {
    this.state = 'VICTORY';
    this.music.stop();

    if (this.cache.audio.has('music_victory')) {
      this.sound.play('music_victory', { volume: 0.6 });
    }

    // Calculate rewards
    let totalXp = 0;
    let totalGold = 0;
    for (const enemy of this.enemyActors) {
      const def = Object.values(ENEMIES).find(e => e.name === enemy.name);
      if (def) { totalXp += def.xpReward; totalGold += def.goldReward; }
    }

    this.showCommandMenu(false);

    this.messageText.setText('VICTORY!').setVisible(true).setColor(YELLOW);
    this.tweens.add({ targets: this.messageText, scale: 1.2, duration: 300, yoyo: true });

    // Show rewards below
    this.time.delayedCall(600, () => {
      this.add.text(W / 2, BATTLE_H / 2 + 60, `+${totalXp} EXP    +${totalGold} Gold`, {
        fontFamily: FONT, fontSize: '30px', color: WHITE,
        stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(100);

      this.add.text(W / 2, BATTLE_H / 2 + 120, 'Press ENTER to continue', {
        fontFamily: FONT, fontSize: '24px', color: GREY,
      }).setOrigin(0.5).setDepth(100);

      // Apply XP to party registry
      this.applyRewards(totalXp);
    });
  }

  private handleDefeat(): void {
    this.state = 'DEFEAT';
    this.music.stop();

    if (this.cache.audio.has('music_game_over')) {
      this.sound.play('music_game_over', { volume: 0.6 });
    }

    this.showCommandMenu(false);
    this.messageText.setText('DEFEAT').setVisible(true).setColor(RED);

    this.time.delayedCall(600, () => {
      this.add.text(W / 2, BATTLE_H / 2 + 60, 'Press ENTER to return to title', {
        fontFamily: FONT, fontSize: '24px', color: GREY,
      }).setOrigin(0.5).setDepth(100);
    });
  }

  private applyRewards(xp: number): void {
    const party = this.registry.get('party') as PartyMember[];

    for (let i = 0; i < party.length; i++) {
      const pm = party[i];
      const actor = this.partyActors[i];

      // Sync HP/MP back
      pm.currentHp = Math.max(0, actor.hp);
      pm.currentMp = Math.max(0, actor.mp);

      // Add XP
      pm.xp += xp;

      // Level up check
      const xpNeeded = pm.level * 100;
      if (pm.xp >= xpNeeded) {
        pm.xp -= xpNeeded;
        pm.level++;
        const cls = HERO_CLASSES.find(c => c.id === pm.classId)!;
        pm.stats.hp += cls.growth.hp;
        pm.stats.mp += cls.growth.mp;
        pm.stats.atk += cls.growth.atk;
        pm.stats.def += cls.growth.def;
        pm.stats.mag += cls.growth.mag;
        pm.stats.spd += cls.growth.spd;
        pm.currentHp = pm.stats.hp; // Full heal on level up
        pm.currentMp = pm.stats.mp;
      }
    }

    this.registry.set('party', party);
  }

  private endBattle(): void {
    this.music.stop();
    this.sound.stopAll();

    if (this.state === 'DEFEAT') {
      this.scene.stop('BattleScene');
      this.scene.start('TitleScene');
      return;
    }

    // Victory → return to overworld
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('BattleScene');
      this.scene.resume('OverworldScene');
    });
  }

  // ════════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════════

  private findActor(id: string): BattleActor | undefined {
    return this.allActors.find(a => a.id === id);
  }

  private getSpriteForActor(actor: BattleActor): Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | undefined {
    if (actor.isEnemy) return this.enemySprites[actor.index];
    return this.heroSprites[actor.index];
  }

  private async showFloatingText(
    target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | undefined,
    text: string,
    color: string,
  ): Promise<void> {
    if (!target) return;
    const t = this.add.text(target.x, target.y - 40, text, {
      fontFamily: FONT, fontSize: '32px', color,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(80);

    await this.tweenPromise(t, { y: t.y - 50, alpha: 0, duration: 800 });
    t.destroy();
  }

  private tweenPromise(target: object, config: object): Promise<void> {
    return new Promise(resolve => {
      this.tweens.add({ targets: target, ...config, onComplete: () => resolve() });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }
}
