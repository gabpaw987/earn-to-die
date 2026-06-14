import Phaser from 'phaser';
import { CAT, RUN, TEX } from '../config';

/**
 * Procedural side-scroll terrain. Builds a smooth-ish hilly height profile,
 * draws a filled dirt polygon, and lays down a chain of static Matter bodies
 * that approximate the surface for the car to drive on.
 */
export class Terrain {
  readonly heights: number[] = [];
  readonly step = 40; // px between sample points
  readonly totalWidth: number;
  private readonly baseY: number;

  constructor(
    private scene: Phaser.Scene,
    distanceM: number,
    roughness: number,
    private worldHeight: number,
  ) {
    // World length: stage distance + a runway before/after.
    this.totalWidth = distanceM * RUN.pxPerMetre + 1600;
    this.baseY = worldHeight * 0.62;
    this.generate(roughness);
    this.draw();
    this.buildBodies();
  }

  private generate(roughness: number) {
    const n = Math.ceil(this.totalWidth / this.step) + 1;
    // Layered sines + a little jitter give natural rolling hills.
    let prevJitter = 0;
    for (let i = 0; i < n; i++) {
      const x = i * this.step;
      // Flat launch pad for the first ~500px so the car spawns safely.
      if (x < 500) {
        this.heights.push(this.baseY);
        continue;
      }
      const a = Math.sin(x * 0.0016) * 70;
      const b = Math.sin(x * 0.0041 + 1.3) * 38;
      const c = Math.sin(x * 0.011 + 0.6) * 16;
      prevJitter = prevJitter * 0.6 + (Math.random() - 0.5) * 10 * 0.4;
      const h = (a + b + c + prevJitter) * roughness;
      this.heights.push(this.baseY + h);
    }
    // Flatten the final stretch so the evac pad is reachable/landable.
    const flatFrom = this.heights.length - 12;
    const flatY = this.heights[Math.max(0, flatFrom)];
    for (let i = Math.max(0, flatFrom); i < this.heights.length; i++) {
      this.heights[i] = flatY;
    }
  }

  /** Surface Y at a given world X (linear interp between samples). */
  heightAt(x: number): number {
    const fx = Phaser.Math.Clamp(x / this.step, 0, this.heights.length - 1);
    const i = Math.floor(fx);
    const t = fx - i;
    const a = this.heights[i];
    const b = this.heights[Math.min(i + 1, this.heights.length - 1)];
    return a + (b - a) * t;
  }

  private draw() {
    const g = this.scene.add.graphics();
    g.setDepth(-5);
    g.fillStyle(0x5a4631, 1);
    g.beginPath();
    g.moveTo(0, this.worldHeight);
    for (let i = 0; i < this.heights.length; i++) {
      g.lineTo(i * this.step, this.heights[i]);
    }
    g.lineTo((this.heights.length - 1) * this.step, this.worldHeight);
    g.closePath();
    g.fillPath();
    // grass/scorched top line
    g.lineStyle(5, 0x6b8e23, 1);
    g.beginPath();
    g.moveTo(0, this.heights[0]);
    for (let i = 1; i < this.heights.length; i++) {
      g.lineTo(i * this.step, this.heights[i]);
    }
    g.strokePath();
  }

  private buildBodies() {
    // Approximate the surface with a series of thin angled static rectangles.
    const M = (this.scene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics }).matter;
    for (let i = 0; i < this.heights.length - 1; i++) {
      const x1 = i * this.step;
      const y1 = this.heights[i];
      const x2 = (i + 1) * this.step;
      const y2 = this.heights[i + 1];
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const len = Phaser.Math.Distance.Between(x1, y1, x2, y2);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const body = M.add.rectangle(midX, midY + 10, len + 2, 24, {
        isStatic: true,
        angle,
        friction: 1,
        collisionFilter: { category: CAT.terrain },
        // a hint of restitution-free, grippy ground
        restitution: 0,
      });
      body.label = 'terrain';
    }
    // visual texture key kept referenced so bundler/types don't drop it
    void TEX.dirt;
  }
}
