import Phaser from 'phaser';
import { GAME, SCENES } from './config';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { UiScene } from './scenes/UiScene';
import { ResultScene } from './scenes/ResultScene';
import { GarageScene } from './scenes/GarageScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: GAME.bg,
  width: GAME.width,
  height: GAME.height,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: GAME.gravityY },
      // debug: true, // flip on to inspect bodies
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    GameScene,
    UiScene,
    ResultScene,
    GarageScene,
  ],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);

// Re-export scene keys for any external tooling.
export { SCENES };
