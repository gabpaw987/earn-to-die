import Phaser from 'phaser';
import { GAME, SCENES } from '../config';
import { Save } from '../state/SaveManager';
import { Sfx } from '../audio/Sfx';

/** Overlay shown while the GameScene is paused. */
export class PauseScene extends Phaser.Scene {
  private stageIndex = 0;
  private muteBtn!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.Pause);
  }

  init(data: { stageIndex?: number }) {
    this.stageIndex = data.stageIndex ?? 0;
  }

  create() {
    const cx = GAME.width / 2;
    this.add.rectangle(cx, GAME.height / 2, GAME.width, GAME.height, 0x000000, 0.6);
    this.add
      .text(cx, 180, 'PAUSED', { fontFamily: 'Impact', fontSize: '72px', color: '#ecf0f1' })
      .setOrigin(0.5);

    this.button(cx, 320, 'RESUME', '#27ae60', () => this.resumeGame());
    this.muteBtn = this.button(cx, 392, '', '#2980b9', () => {
      const m = Sfx.toggleMute();
      Save.setMuted(m);
      this.refreshMute();
    });
    this.refreshMute();
    this.button(cx, 464, 'GARAGE', '#8e44ad', () => this.quitTo(SCENES.Garage));
    this.button(cx, 536, 'MAIN MENU', '#7f8c8d', () => this.quitTo(SCENES.Menu));

    this.input.keyboard!.on('keydown-ESC', () => this.resumeGame());
    this.input.keyboard!.on('keydown-P', () => this.resumeGame());
  }

  private refreshMute() {
    this.muteBtn.setText(Sfx.muted ? 'SOUND: OFF' : 'SOUND: ON');
  }

  private resumeGame() {
    Sfx.ui();
    this.scene.stop();
    this.scene.resume(SCENES.Game);
  }

  private quitTo(target: string) {
    Sfx.ui();
    this.scene.stop(SCENES.Ui);
    this.scene.stop(SCENES.Game);
    this.scene.stop();
    this.scene.start(target, { stageIndex: this.stageIndex });
  }

  private button(x: number, y: number, text: string, bg: string, onClick: () => void) {
    const b = this.add
      .text(x, y, text, {
        fontFamily: 'Trebuchet MS',
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: bg,
        padding: { x: 30, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    b.on('pointerover', () => b.setAlpha(0.85));
    b.on('pointerout', () => b.setAlpha(1));
    b.on('pointerdown', onClick);
    return b;
  }
}
