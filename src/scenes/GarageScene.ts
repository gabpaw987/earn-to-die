import Phaser from 'phaser';
import { GAME, SCENES } from '../config';
import { Save } from '../state/SaveManager';
import { UPGRADES, UPGRADE_ORDER, nextTier } from '../data/upgrades';
import { STAGES } from '../data/levels';
import { VEHICLES } from '../data/vehicles';
import { Sfx } from '../audio/Sfx';
import type { UpgradeKey } from '../types';

/** Spend cash on a vehicle + upgrade tiers, then DEPLOY into the selected stage. */
export class GarageScene extends Phaser.Scene {
  private stageIndex = 0;
  private cashText!: Phaser.GameObjects.Text;
  private rows = new Map<UpgradeKey, { tier: Phaser.GameObjects.Text; buy: Phaser.GameObjects.Text }>();
  private vehBtns = new Map<string, Phaser.GameObjects.Text>();

  constructor() {
    super(SCENES.Garage);
  }

  init(data: { stageIndex?: number }) {
    this.stageIndex = data.stageIndex ?? 0;
    this.rows = new Map();
    this.vehBtns = new Map();
  }

  create() {
    const cx = GAME.width / 2;
    this.add.rectangle(cx, GAME.height / 2, GAME.width, GAME.height, 0x12181f, 1);

    this.add
      .text(cx, 34, 'GARAGE', { fontFamily: 'Impact', fontSize: '48px', color: '#ecf0f1' })
      .setOrigin(0.5);
    this.cashText = this.add
      .text(cx, 74, '', { fontFamily: 'Impact', fontSize: '30px', color: '#f1c40f' })
      .setOrigin(0.5);

    // --- Vehicles row ---
    this.add.text(40, 104, 'VEHICLE', { fontFamily: 'Trebuchet MS', fontSize: '20px', color: '#bdc3c7' });
    const vw = 360;
    VEHICLES.forEach((v, i) => {
      const x = 200 + i * vw;
      const btn = this.add
        .text(x, 128, '', {
          fontFamily: 'Trebuchet MS',
          fontSize: '18px',
          color: '#ffffff',
          backgroundColor: '#243240',
          padding: { x: 14, y: 8 },
          align: 'center',
          fixedWidth: vw - 40,
        })
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setAlpha(0.85));
      btn.on('pointerout', () => btn.setAlpha(1));
      btn.on('pointerdown', () => this.onVehicle(v.key));
      this.vehBtns.set(v.key, btn);
    });

    // --- Upgrades ---
    const startY = 196;
    const rowH = 66;
    UPGRADE_ORDER.forEach((key, i) => {
      const def = UPGRADES[key];
      const y = startY + i * rowH;
      this.add.rectangle(cx, y + 20, 1120, rowH - 10, 0x1c2530, 1).setOrigin(0.5);

      this.add.text(80, y, def.name, { fontFamily: 'Trebuchet MS', fontSize: '24px', color: '#ffffff' });
      this.add.text(80, y + 30, def.blurb, {
        fontFamily: 'Trebuchet MS',
        fontSize: '14px',
        color: '#95a5a6',
      });

      const tierText = this.add
        .text(720, y + 12, '', { fontFamily: 'Trebuchet MS', fontSize: '19px', color: '#5dade2' })
        .setOrigin(0.5, 0);
      const buyBtn = this.add
        .text(1010, y + 12, '', {
          fontFamily: 'Trebuchet MS',
          fontSize: '19px',
          color: '#ffffff',
          backgroundColor: '#27ae60',
          padding: { x: 14, y: 9 },
        })
        .setOrigin(0.5, 0)
        .setInteractive({ useHandCursor: true });
      buyBtn.on('pointerdown', () => {
        if (Save.buyNext(key)) {
          Sfx.coin();
          this.refreshRow(key);
          this.refreshAll();
          this.tweens.add({ targets: buyBtn, scale: 1.12, duration: 90, yoyo: true });
        } else {
          Sfx.hit();
          this.cameras.main.shake(120, 0.004);
        }
      });
      buyBtn.on('pointerover', () => buyBtn.setAlpha(0.85));
      buyBtn.on('pointerout', () => buyBtn.setAlpha(1));
      this.rows.set(key, { tier: tierText, buy: buyBtn });
    });

    // --- Deploy / back / mute ---
    const stage = STAGES[this.stageIndex];
    const deploy = this.add
      .text(cx + 270, GAME.height - 44, `DEPLOY → ${stage.name}`, {
        fontFamily: 'Impact',
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: '#c0392b',
        padding: { x: 22, y: 11 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    deploy.on('pointerover', () => deploy.setAlpha(0.85));
    deploy.on('pointerout', () => deploy.setAlpha(1));
    deploy.on('pointerdown', () => {
      Sfx.resume();
      Sfx.ui();
      this.scene.start(SCENES.Game, { stageIndex: this.stageIndex });
    });

    const back = this.add
      .text(cx - 320, GAME.height - 44, '← MENU', {
        fontFamily: 'Trebuchet MS',
        fontSize: '22px',
        color: '#ecf0f1',
        backgroundColor: '#34495e',
        padding: { x: 16, y: 11 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => {
      Sfx.ui();
      this.scene.start(SCENES.Menu);
    });

    const mute = this.add
      .text(GAME.width - 24, 24, Sfx.muted ? '🔇 OFF' : '🔊 ON', {
        fontFamily: 'Trebuchet MS',
        fontSize: '20px',
        color: '#ecf0f1',
        backgroundColor: '#2c3e50',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    mute.on('pointerdown', () => {
      const m = Sfx.toggleMute();
      Save.setMuted(m);
      mute.setText(m ? '🔇 OFF' : '🔊 ON');
    });

    this.refreshAll();
  }

  private onVehicle(key: string) {
    if (Save.ownsVehicle(key)) {
      if (Save.selectVehicle(key)) Sfx.ui();
    } else if (Save.buyVehicle(key)) {
      Sfx.coin();
      Save.selectVehicle(key);
    } else {
      Sfx.hit();
      this.cameras.main.shake(120, 0.004);
    }
    this.refreshAll();
  }

  private refreshAll() {
    this.cashText.setText(`BANK  $${Save.get().cash}`);
    for (const key of this.rows.keys()) this.refreshRow(key);
    this.refreshVehicles();
  }

  private refreshVehicles() {
    const selected = Save.get().selectedVehicle;
    for (const v of VEHICLES) {
      const btn = this.vehBtns.get(v.key);
      if (!btn) continue;
      const owned = Save.ownsVehicle(v.key);
      let line: string;
      let bg: string;
      if (v.key === selected) {
        line = `${v.name}\n✓ SELECTED`;
        bg = '#1e7a44';
      } else if (owned) {
        line = `${v.name}\nTAP TO USE`;
        bg = '#243240';
      } else {
        const afford = Save.get().cash >= v.cost;
        line = `${v.name}\nBUY $${v.cost}`;
        bg = afford ? '#2980b9' : '#7f3a3a';
      }
      btn.setText(line).setBackgroundColor(bg);
    }
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
    row.buy.setText(`${nxt.tier.label}  $${nxt.tier.cost}`).setBackgroundColor(afford ? '#27ae60' : '#7f3a3a');
  }
}
