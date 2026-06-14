import Phaser from 'phaser';
import { GAME, SCENES } from '../config';
import { Save } from '../state/SaveManager';
import { STAGES } from '../data/levels';
import type { RunResult } from '../types';

/** Post-run summary; banks cash (already added in GameScene) and routes on. */
export class ResultScene extends Phaser.Scene {
  private result!: RunResult;

  constructor() {
    super(SCENES.Result);
  }

  init(data: RunResult) {
    this.result = data;
  }

  create() {
    const cx = GAME.width / 2;
    const r = this.result;
    const stage = STAGES[r.stageIndex];

    this.add.rectangle(cx, GAME.height / 2, GAME.width, GAME.height, 0x000000, 0.7);

    const title = r.reachedEvac ? 'STAGE CLEARED!' : 'YOU DIED';
    const color = r.reachedEvac ? '#2ecc71' : '#e74c3c';
    this.add
      .text(cx, 130, title, { fontFamily: 'Impact', fontSize: '76px', color })
      .setOrigin(0.5);

    this.add
      .text(cx, 200, stage.name, { fontFamily: 'Trebuchet MS', fontSize: '28px', color: '#ecf0f1' })
      .setOrigin(0.5);

    const lines = [
      `Distance:  ${r.distanceM} m  /  ${stage.distanceM} m`,
      `Zombies splattered:  ${r.kills}`,
      `Best combo:  x${r.maxCombo}      Stunts:  ${r.stunts}`,
      `Cash earned:  $${r.cashCollected}`,
      `Bank total:  $${Save.get().cash}`,
    ];
    this.add
      .text(cx, 310, lines.join('\n'), {
        fontFamily: 'Trebuchet MS',
        fontSize: '28px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 14,
      })
      .setOrigin(0.5, 0);

    const nextUnlocked = r.reachedEvac && r.stageIndex + 1 < STAGES.length;
    if (nextUnlocked) {
      this.add
        .text(cx, 470, `New stage unlocked: ${STAGES[r.stageIndex + 1].name}!`, {
          fontFamily: 'Trebuchet MS',
          fontSize: '24px',
          color: '#f1c40f',
        })
        .setOrigin(0.5);
    }

    this.button(cx - 200, 560, 'GARAGE', '#2980b9', () =>
      this.scene.start(SCENES.Garage, { stageIndex: r.stageIndex }),
    );
    this.button(cx + 200, 560, 'RETRY', '#27ae60', () =>
      this.scene.start(SCENES.Game, { stageIndex: r.stageIndex }),
    );
    this.button(cx, 640, 'MAIN MENU', '#7f8c8d', () => this.scene.start(SCENES.Menu));
  }

  private button(x: number, y: number, text: string, bg: string, onClick: () => void) {
    const b = this.add
      .text(x, y, text, {
        fontFamily: 'Trebuchet MS',
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: bg,
        padding: { x: 26, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    b.on('pointerover', () => b.setAlpha(0.85));
    b.on('pointerout', () => b.setAlpha(1));
    b.on('pointerdown', onClick);
    return b;
  }
}
