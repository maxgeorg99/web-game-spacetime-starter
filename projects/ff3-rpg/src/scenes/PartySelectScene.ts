import * as Phaser from 'phaser';
import { HERO_CLASSES, HeroClass } from '../data/classes';

interface PortraitCard {
  cls: HeroClass;
  portrait: Phaser.GameObjects.Image;
  border: Phaser.GameObjects.Rectangle;
  checkmark: Phaser.GameObjects.Text;
  selected: boolean;
  index: number;
  x: number;
  y: number;
}

export class PartySelectScene extends Phaser.Scene {
  private cards: PortraitCard[] = [];
  private selectedClasses: HeroClass[] = [];
  private partyCountText!: Phaser.GameObjects.Text;
  private confirmRect!: Phaser.GameObjects.Rectangle;
  private confirmText!: Phaser.GameObjects.Text;
  private cursorIndex = 0;
  private cursorHighlight!: Phaser.GameObjects.Rectangle;

  // Stat panel
  private statPanel!: Phaser.GameObjects.Rectangle;
  private statTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('PartySelectScene');
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Background
    this.add.rectangle(cx, height / 2, width, height, 0x0a0a1a);

    // Title
    this.add.text(cx, 60, 'SELECT YOUR PARTY', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#ffdd88',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 130, 'Choose 4 heroes', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Grid: 3 cols × 2 rows, centred in left ~75% of screen
    // Portraits are ~96×110 at scale 2 = ~192×220 display size
    const cols = [380, 760, 1140];
    const rows  = [400, 720];
    const portraitScale = 2.0;
    const borderSize = 230;

    // Cursor highlight (behind cards)
    this.cursorHighlight = this.add.rectangle(0, 0, borderSize + 20, borderSize + 20, 0x4444cc, 0.35)
      .setVisible(false);

    HERO_CLASSES.forEach((cls, i) => {
      const px = cols[i % 3];
      const py = rows[Math.floor(i / 3)];

      const border = this.add.rectangle(px, py, borderSize, borderSize, 0x00cc44)
        .setVisible(false);

      const portrait = this.add.image(px, py, cls.portraitKey)
        .setScale(portraitScale)
        .setInteractive({ useHandCursor: true });

      const checkmark = this.add.text(px + 90, py - 100, '✓', {
        fontFamily: 'monospace', fontSize: '44px', color: '#00ff66',
        stroke: '#003300', strokeThickness: 3,
      }).setOrigin(0.5).setVisible(false);

      this.add.text(px, py + 135, cls.name, {
        fontFamily: 'monospace', fontSize: '26px', color: '#cccccc',
      }).setOrigin(0.5);

      const card: PortraitCard = { cls, portrait, border, checkmark, selected: false, index: i, x: px, y: py };
      this.cards.push(card);

      portrait.on('pointerover', () => {
        portrait.setTint(0xffffaa);
        this.showStatPanel(cls);
        this.cursorIndex = i;
        this.updateCursor();
      });
      portrait.on('pointerout', () => {
        portrait.clearTint();
        this.hideStatPanel();
      });
      portrait.on('pointerdown', () => this.toggleCard(card));
    });

    // ── Stat panel (right side) ─────────────────────────────────────
    const panelX = 1580;
    const panelY = 480;
    const panelW = 280;
    const panelH = 420;

    this.statPanel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x111133)
      .setAlpha(0.92).setVisible(false);

    const lh = 44; // line height
    const tx = panelX - panelW / 2 + 18;
    const labels = ['', 'HP', 'MP', 'ATK', 'DEF', 'MAG', 'SPD', '', 'Role'];
    labels.forEach((_, idx) => {
      const t = this.add.text(tx, panelY - panelH / 2 + 28 + idx * lh, '', {
        fontFamily: 'monospace',
        fontSize: idx === 0 ? '28px' : idx === 8 ? '22px' : '24px',
        color: idx === 0 ? '#ffdd88' : idx === 8 ? '#aaaaaa' : '#ffffff',
      }).setVisible(false);
      this.statTexts.push(t);
    });

    // ── Bottom bar ─────────────────────────────────────────────────
    this.partyCountText = this.add.text(cx, 960, 'Party: 0 / 4', {
      fontFamily: 'monospace', fontSize: '34px', color: '#ffffff',
    }).setOrigin(0.5);

    this.confirmRect = this.add.rectangle(1700, 960, 280, 70, 0x226622)
      .setVisible(false).setInteractive({ useHandCursor: true });
    this.confirmText = this.add.text(1700, 960, 'CONFIRM', {
      fontFamily: 'monospace', fontSize: '30px', color: '#aaffaa',
    }).setOrigin(0.5).setVisible(false);

    this.confirmRect.on('pointerover', () => this.confirmRect.setFillStyle(0x33aa33));
    this.confirmRect.on('pointerout',  () => this.confirmRect.setFillStyle(0x226622));
    this.confirmRect.on('pointerdown', () => this.confirmParty());

    // ── Keyboard ────────────────────────────────────────────────────
    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT',  () => { this.cursorIndex = (this.cursorIndex - 1 + 6) % 6; this.updateCursor(); });
    kb.on('keydown-RIGHT', () => { this.cursorIndex = (this.cursorIndex + 1) % 6; this.updateCursor(); });
    kb.on('keydown-UP',    () => { this.cursorIndex = (this.cursorIndex - 3 + 6) % 6; this.updateCursor(); });
    kb.on('keydown-DOWN',  () => { this.cursorIndex = (this.cursorIndex + 3) % 6; this.updateCursor(); });
    kb.on('keydown-ENTER', () => {
      if (this.selectedClasses.length === 4) { this.confirmParty(); return; }
      const card = this.cards[this.cursorIndex];
      if (card) this.toggleCard(card);
    });

    this.updateCursor();
  }

  private toggleCard(card: PortraitCard): void {
    if (card.selected) {
      card.selected = false;
      card.border.setVisible(false);
      card.checkmark.setVisible(false);
      this.selectedClasses = this.selectedClasses.filter(c => c.id !== card.cls.id);
    } else {
      if (this.selectedClasses.length >= 4) return;
      card.selected = true;
      card.border.setVisible(true);
      card.checkmark.setVisible(true);
      this.selectedClasses.push(card.cls);
    }
    this.updateUI();
  }

  private updateUI(): void {
    const n = this.selectedClasses.length;
    this.partyCountText.setText(`Party: ${n} / 4`);
    this.confirmRect.setVisible(n === 4);
    this.confirmText.setVisible(n === 4);
  }

  private updateCursor(): void {
    const card = this.cards[this.cursorIndex];
    if (!card) return;
    this.cursorHighlight.setPosition(card.x, card.y).setVisible(true);
  }

  private showStatPanel(cls: HeroClass): void {
    const s = cls.baseStats;
    const values = [cls.name, `HP : ${s.hp}`, `MP : ${s.mp}`, `ATK: ${s.atk}`,
                    `DEF: ${s.def}`, `MAG: ${s.mag}`, `SPD: ${s.spd}`, '', cls.role];
    this.statPanel.setVisible(true);
    this.statTexts.forEach((t, i) => t.setText(values[i]).setVisible(true));
  }

  private hideStatPanel(): void {
    this.statPanel.setVisible(false);
    this.statTexts.forEach(t => t.setVisible(false));
  }

  private confirmParty(): void {
    const partyData = this.selectedClasses.map(cls => ({
      classId: cls.id,
      name: cls.name,
      level: 1,
      xp: 0,
      currentHp: cls.baseStats.hp,
      currentMp: cls.baseStats.mp,
      stats: { ...cls.baseStats },
    }));
    this.registry.set('party', partyData);
    console.log('Party confirmed:', partyData);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('OverworldScene');
    });
  }
}
