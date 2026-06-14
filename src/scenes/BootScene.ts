import Phaser from 'phaser';
import { SCENES } from '../config';
import { Save } from '../state/SaveManager';

/** Minimal boot: load persistent save, then move to texture generation. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Boot);
  }

  create() {
    Save.load();
    this.scene.start(SCENES.Preload);
  }
}
