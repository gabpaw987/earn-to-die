import Phaser from 'phaser';
import { SCENES, TEX } from '../config';

/**
 * Generates every texture procedurally so the repo ships zero binary assets.
 * Each helper draws into a Graphics object then bakes it to a texture key.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Preload);
  }

  create() {
    this.makeChassis();
    this.makeWheel();
    this.makeZombie();
    this.makeFuelCan();
    this.makeCashBag();
    this.makeDirt();
    this.makeParticle();
    this.makeEvac();
    this.makeBullet();
    this.scene.start(SCENES.Menu);
  }

  private bake(key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeChassis() {
    const w = 150;
    const h = 64;
    this.bake(TEX.chassis, w, h, (g) => {
      // Body
      g.fillStyle(0xb23a2f, 1);
      g.fillRoundedRect(2, 18, w - 4, h - 26, 8);
      // Cabin
      g.fillStyle(0x7c2820, 1);
      g.fillRoundedRect(36, 2, 64, 26, 6);
      // Windshield
      g.fillStyle(0x9fd0e0, 1);
      g.fillRoundedRect(42, 6, 50, 16, 4);
      // Bull bar / front
      g.fillStyle(0x4a4a4a, 1);
      g.fillRect(w - 14, 24, 12, 22);
      // Outline
      g.lineStyle(2, 0x2a120f, 1);
      g.strokeRoundedRect(2, 18, w - 4, h - 26, 8);
    });
  }

  private makeWheel() {
    const r = 28;
    const d = r * 2;
    this.bake(TEX.wheel, d, d, (g) => {
      g.fillStyle(0x1c1c1c, 1);
      g.fillCircle(r, r, r);
      g.fillStyle(0x3a3a3a, 1);
      g.fillCircle(r, r, r * 0.55);
      g.fillStyle(0x8a8a8a, 1);
      g.fillCircle(r, r, r * 0.22);
      // lug spokes for rotation readability
      g.lineStyle(3, 0x111111, 1);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.beginPath();
        g.moveTo(r, r);
        g.lineTo(r + Math.cos(a) * r * 0.5, r + Math.sin(a) * r * 0.5);
        g.strokePath();
      }
    });
  }

  private makeZombie() {
    const w = 30;
    const h = 50;
    this.bake(TEX.zombie, w, h, (g) => {
      // body
      g.fillStyle(0x4b6b3a, 1);
      g.fillRoundedRect(7, 16, 16, 30, 4);
      // head
      g.fillStyle(0x6f9152, 1);
      g.fillCircle(15, 11, 9);
      // eye
      g.fillStyle(0xc0392b, 1);
      g.fillCircle(12, 10, 2);
      g.fillCircle(18, 10, 2);
      // arms out front
      g.fillStyle(0x4b6b3a, 1);
      g.fillRect(20, 20, 12, 5);
    });
  }

  private makeFuelCan() {
    const s = 34;
    this.bake(TEX.fuelCan, s, s, (g) => {
      g.fillStyle(0xd34b21, 1);
      g.fillRoundedRect(4, 6, s - 8, s - 10, 4);
      g.fillStyle(0x222222, 1);
      g.fillRect(s / 2 - 3, 0, 6, 8);
      g.fillStyle(0xffe08a, 1);
      g.fillRect(9, 14, s - 18, 4);
    });
  }

  private makeCashBag() {
    const s = 34;
    this.bake(TEX.cashBag, s, s, (g) => {
      g.fillStyle(0x2e7d32, 1);
      g.fillCircle(s / 2, s / 2 + 3, s / 2 - 3);
      g.fillStyle(0xffd54f, 1);
      g.fillRect(s / 2 - 7, s / 2 - 4, 14, 14);
      g.fillStyle(0x2e7d32, 1);
      g.fillRect(s / 2 - 1.5, s / 2 - 6, 3, 18);
    });
  }

  private makeDirt() {
    // small tile used as a fill pattern strip under the terrain line
    this.bake(TEX.dirt, 8, 8, (g) => {
      g.fillStyle(0x5a4631, 1);
      g.fillRect(0, 0, 8, 8);
      g.fillStyle(0x4a3826, 1);
      g.fillRect(0, 4, 4, 4);
      g.fillRect(4, 0, 4, 4);
    });
  }

  private makeParticle() {
    this.bake(TEX.particle, 8, 8, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
    });
  }

  private makeEvac() {
    const w = 20;
    const h = 120;
    this.bake(TEX.evac, w, h, (g) => {
      g.fillStyle(0xeeeeee, 1);
      g.fillRect(8, 0, 4, h);
      g.fillStyle(0x27ae60, 1);
      g.fillTriangle(12, 4, 12, 40, 0, 22);
    });
  }

  private makeBullet() {
    this.bake(TEX.bullet, 10, 4, (g) => {
      g.fillStyle(0xfff176, 1);
      g.fillRect(0, 0, 10, 4);
    });
  }
}
