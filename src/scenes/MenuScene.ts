import Phaser from 'phaser';
import { GAME, SCENES } from '../config';
import { Save } from '../state/SaveManager';
import { STAGES } from '../data/levels';

/** Title screen + stage select (only unlocked stages are playable). */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Menu);
  }

  create() {
    const cx = GAME.width / 2;
    const data = Save.get();

    this.add
      .text(cx, 90, 'EARN TO DIE', {
        fontFamily: 'Impact, Trebuchet MS, sans-serif',
        fontSize: '92px',
        color: '#e74c3c',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 156, 'EVAC RUN', {
        fontFamily: 'Trebuchet MS',
        fontSize: '34px',
        color: '#ecf0f1',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 214, `Bank: $${data.cash}    Lifetime kills: ${data.lifetimeKills}`, {
        fontFamily: 'Trebuchet MS',
        fontSize: '22px',
        color: '#f1c40f',
      })
      .setOrigin(0.5);

    // Stage buttons
    const startY = 290;
    STAGES.forEach((stage, i) => {
      const unlocked = i <= data.stageUnlocked;
      const best = data.bestDistance[i] ?? 0;
      const y = startY + i * 64;
      const label = unlocked
        ? `${i + 1}. ${stage.name}  —  ${stage.distanceM}m   (best ${best}m)`
        : `${i + 1}. ??? — locked`;
      const btn = this.add
        .text(cx, y, label, {
          fontFamily: 'Trebuchet MS',
          fontSize: '26px',
          color: unlocked ? '#ffffff' : '#7f8c8d',
          backgroundColor: unlocked ? '#2c3e50' : '#1a1a1a',
          padding: { x: 18, y: 10 },
        })
        .setOrigin(0.5);

      if (unlocked) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setColor('#f1c40f'));
        btn.on('pointerout', () => btn.setColor('#ffffff'));
        btn.on('pointerdown', () => {
          this.scene.start(SCENES.Garage, { stageIndex: i });
        });
      }
    });

    this.add
      .text(cx, GAME.height - 40, 'Click a stage → Garage → DEPLOY.  Arrows/WASD to drive.', {
        fontFamily: 'Trebuchet MS',
        fontSize: '18px',
        color: '#95a5a6',
      })
      .setOrigin(0.5);
  }
}
