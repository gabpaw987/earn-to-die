import Phaser from 'phaser';
import { GAME, SCENES } from '../config';
import { Save } from '../state/SaveManager';
import { STAGES } from '../data/levels';
import { getVehicle } from '../data/vehicles';
import { Sfx } from '../audio/Sfx';

/** Title screen + stage select (only unlocked stages are playable). */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Menu);
  }

  create() {
    const cx = GAME.width / 2;
    const data = Save.get();
    Sfx.setMuted(data.muted);

    this.add
      .text(cx, 60, 'EARN TO DIE', {
        fontFamily: 'Impact, sans-serif',
        fontSize: '76px',
        color: '#e74c3c',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 110, 'EVAC RUN', { fontFamily: 'Trebuchet MS', fontSize: '28px', color: '#ecf0f1' })
      .setOrigin(0.5);

    const veh = getVehicle(data.selectedVehicle);
    this.add
      .text(
        cx,
        150,
        `Bank $${data.cash}   ·   Rig: ${veh.name}   ·   Kills ${data.lifetimeKills}   ·   Best combo x${data.bestCombo}`,
        { fontFamily: 'Trebuchet MS', fontSize: '20px', color: '#f1c40f' },
      )
      .setOrigin(0.5);

    // Stage list (compact rows; supports all 8).
    const startY = 200;
    const rowH = 50;
    STAGES.forEach((stage, i) => {
      const unlocked = i <= data.stageUnlocked;
      const best = data.bestDistance[i] ?? 0;
      const y = startY + i * rowH;
      const label = unlocked
        ? `${i + 1}. ${stage.name}  —  ${stage.distanceM}m   (best ${best}m)`
        : `${i + 1}. ??? — locked`;
      const btn = this.add
        .text(cx, y, label, {
          fontFamily: 'Trebuchet MS',
          fontSize: '23px',
          color: unlocked ? '#ffffff' : '#7f8c8d',
          backgroundColor: unlocked ? '#2c3e50' : '#1a1a1a',
          padding: { x: 16, y: 7 },
        })
        .setOrigin(0.5);

      if (unlocked) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setColor('#f1c40f'));
        btn.on('pointerout', () => btn.setColor('#ffffff'));
        btn.on('pointerdown', () => {
          Sfx.resume();
          Sfx.ui();
          this.scene.start(SCENES.Garage, { stageIndex: i });
        });
      }
    });

    // Mute toggle.
    const muteBtn = this.add
      .text(GAME.width - 24, 24, Sfx.muted ? '🔇 OFF' : '🔊 ON', {
        fontFamily: 'Trebuchet MS',
        fontSize: '22px',
        color: '#ecf0f1',
        backgroundColor: '#2c3e50',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    muteBtn.on('pointerdown', () => {
      Sfx.resume();
      const m = Sfx.toggleMute();
      Save.setMuted(m);
      muteBtn.setText(m ? '🔇 OFF' : '🔊 ON');
    });

    this.add
      .text(cx, GAME.height - 28, 'Click a stage → Garage → DEPLOY.   Arrows/WASD drive, SPACE fire, SHIFT nitro.', {
        fontFamily: 'Trebuchet MS',
        fontSize: '17px',
        color: '#95a5a6',
      })
      .setOrigin(0.5);
  }
}
