import Phaser from 'phaser';
import { GAME, SCENES } from '../config';
import { Save } from '../state/SaveManager';
import { UPGRADES, UPGRADE_ORDER, nextTier } from '../data/upgrades';
import { STAGES } from '../data/levels';
import type { UpgradeKey } from '../types';

/** Spend cash on upgrade tiers, then DEPLOY into the selected stage. */
export class GarageScene extends Phaser.Scene {
  private stageIndex = 0;
  private cashText!: Phaser.GameObjects.Text;
  private rows: Map<UpgradeKey, { tier: Phaser.GameObjects.Text; buy: Phaser.GameObjects.Text }> =
    new Map();

  constructor() {
    super(SCENES.Garage);
  }

  init(data: { stageIndex?: number }) {
    this.stageIndex = data.stageIndex ?? 0;
    this.rows = new Map();
  }

  create() {
    const cx = GAME.width / 2;
    this.add.rectangle(cx, GAME.height / 2, GAME.width, GAME.height, 0x12181f, 1);

    this.add
      .text(cx, 44, 'GARAGE', { fontFamily: 'Impact', fontSize: '60px', color: '#ecf0f1' })
      .setOrigin(0.5);

    this.cashText = this.add
      .text(cx, 96, '', { fontFamily: 'Impact', fontSize: '34px', color: '#f1c40f' })
      .setOrigin(0.5);

    const startY = 160;
    const rowH = 84;
    UPGRADE_ORDER.forEach((key, i) => {
      const def = UPGRADES[key];
      const y = startY + i * rowH;

      this.add.rectangle(cx, y + 24, 1080, rowH - 12, 0x1c2530, 1).setOrigin(0.5);

      this.add.text(220, y, def.name, {
        fontFamily: 'Trebuchet MS',
        fontSize: '26px',
        color: '#ffffff',
      });
      this.add.text(220, y + 32, def.blurb, {
        fontFamily: 'Trebuchet MS',
        fontSize: '15px',
        color: '#95a5a6',
      });

      const tierText = this.add
        .text(720, y + 14, '', { fontFamily: 'Trebuchet MS', fontSize: '20px', color: '#5dade2' })
        .setOrigin(0.5, 0);

      const buyBtn = this.add
        .text(980, y + 14, '', {
          fontFamily: 'Trebuchet MS',
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: '#27ae60',
          padding: { x: 16, y: 10 },
        })
        .setOrigin(0.5, 0)
        .setInteractive({ useHandCursor: true });

      buyBtn.on('pointerdown', () => {
        if (Save.buyNext(key)) {
          this.refreshRow(key);
          this.refreshCash();
          this.tweens.add({ targets: buyBtn, scale: 1.12, duration: 90, yoyo: true });
        } else {
          this.cameras.main.shake(120, 0.004);
        }
      });
      buyBtn.on('pointerover', () => buyBtn.setAlpha(0.85));
      buyBtn.on('pointerout', () => buyBtn.setAlpha(1));

      this.rows.set(key, { tier: tierText, buy: buyBtn });
      this.refreshRow(key);
    });

    // Deploy + back
    const stage = STAGES[this.stageIndex];
    const deploy = this.add
      .text(cx + 260, GAME.height - 50, `DEPLOY → ${stage.name}`, {
        fontFamily: 'Impact',
        fontSize: '30px',
        color: '#ffffff',
        backgroundColor: '#c0392b',
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    deploy.on('pointerover', () => deploy.setAlpha(0.85));
    deploy.on('pointerout', () => deploy.setAlpha(1));
    deploy.on('pointerdown', () => this.scene.start(SCENES.Game, { stageIndex: this.stageIndex }));

    const back = this.add
      .text(cx - 300, GAME.height - 50, '← MENU', {
        fontFamily: 'Trebuchet MS',
        fontSize: '24px',
        color: '#ecf0f1',
        backgroundColor: '#34495e',
        padding: { x: 18, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start(SCENES.Menu));

    this.refreshCash();
  }

  private refreshCash() {
    this.cashText.setText(`BANK  $${Save.get().cash}`);
    // Re-evaluate affordability colouring on every row.
    for (const key of this.rows.keys()) this.refreshRow(key);
  }

  private refreshRow(key: UpgradeKey) {
    const row = this.rows.get(key);
    if (!row) return;
    const owned = Save.get().tiers[key];
    row.tier.setText(`Tier: ${Save.tierLabel(key)}`);

    const nxt = nextTier(key, owned);
    if (!nxt) {
      row.buy.setText('MAX').disableInteractive().setBackgroundColor('#555555');
      return;
    }
    const afford = Save.get().cash >= nxt.tier.cost;
    row.buy
      .setText(`${nxt.tier.label}  $${nxt.tier.cost}`)
      .setBackgroundColor(afford ? '#27ae60' : '#7f3a3a');
  }
}
