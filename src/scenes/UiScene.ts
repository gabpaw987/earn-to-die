import Phaser from 'phaser';
import { GAME, SCENES } from '../config';

interface HudState {
  fuelPct: number;
  distanceM: number;
  targetM: number;
  cash: number;
  speed: number;
  boost: number;
  stageName: string;
}

/** Transparent overlay scene drawing the run HUD from 'hud' events. */
export class UiScene extends Phaser.Scene {
  private fuelBar!: Phaser.GameObjects.Graphics;
  private progBar!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private cashText!: Phaser.GameObjects.Text;
  private boostText!: Phaser.GameObjects.Text;
  private handler = (s: HudState) => this.render(s);

  constructor() {
    super(SCENES.Ui);
  }

  create() {
    this.fuelBar = this.add.graphics();
    this.progBar = this.add.graphics();

    this.add.text(24, 20, 'FUEL', { fontFamily: 'Trebuchet MS', fontSize: '16px', color: '#ecf0f1' });
    this.cashText = this.add.text(24, 70, '$0', {
      fontFamily: 'Impact',
      fontSize: '34px',
      color: '#f1c40f',
    });
    this.boostText = this.add.text(24, 116, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#5dade2',
    });
    this.label = this.add
      .text(GAME.width / 2, 24, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);

    this.add
      .text(GAME.width - 24, GAME.height - 30, '→/D drive   ←/A brake/tilt   SPACE fire   SHIFT nitro   ESC end', {
        fontFamily: 'Trebuchet MS',
        fontSize: '15px',
        color: '#bdc3c7',
      })
      .setOrigin(1, 1);

    this.game.events.on('hud', this.handler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('hud', this.handler);
    });
  }

  private render(s: HudState) {
    // Fuel bar
    this.fuelBar.clear();
    this.fuelBar.fillStyle(0x000000, 0.5).fillRect(70, 18, 220, 22);
    const fc = s.fuelPct > 0.3 ? 0x2ecc71 : 0xe74c3c;
    this.fuelBar.fillStyle(fc, 1).fillRect(72, 20, 216 * Phaser.Math.Clamp(s.fuelPct, 0, 1), 18);

    // Progress bar (distance to evac)
    const pw = GAME.width - 320;
    const px = 160;
    const py = GAME.height - 60;
    this.progBar.clear();
    this.progBar.fillStyle(0x000000, 0.4).fillRect(px, py, pw, 14);
    const t = Phaser.Math.Clamp(s.distanceM / s.targetM, 0, 1);
    this.progBar.fillStyle(0x3498db, 1).fillRect(px, py, pw * t, 14);
    this.progBar.fillStyle(0x2ecc71, 1).fillRect(px + pw - 4, py - 4, 6, 22);

    this.cashText.setText(`$${s.cash}`);
    this.boostText.setText(s.boost > 0 ? `NITRO x${s.boost} (SHIFT)` : '');
    this.label.setText(
      `${s.stageName}   ${Math.floor(s.distanceM)}m / ${s.targetM}m   ·   ${Math.round(s.speed * 6)} km/h`,
    );
  }
}
