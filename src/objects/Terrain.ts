import Phaser from 'phaser';
import { CAT, RUN } from '../config';

export interface TerrainOpts {
  /** Terrain amplitude multiplier at world-x. */
  roughAt?: (x: number) => number;
  /** Vertical slope (px per px; negative = uphill) at world-x. */
  slopeAt?: (x: number) => number;
  /** World-x ranges that are carved as bottomless gaps. */
  gaps?: Array<[number, number]>;
}

const GAP_Y = 100000; // sentinel: "no ground here"

/**
 * Procedural side-scroll terrain. Builds a height profile (optionally driven by
 * an authored per-segment roughness/slope function with carved gaps), draws a
 * filled dirt silhouette broken at gaps, and lays a chain of static Matter
 * bodies for the car to drive on (also broken at gaps so holes are real).
 */
export class Terrain {
  readonly heights: number[] = [];
  private readonly gapFlags: boolean[] = [];
  readonly step = 40;
  readonly totalWidth: number;
  private readonly baseY: number;

  constructor(
    private scene: Phaser.Scene,
    distanceM: number,
    roughness: number,
    private worldHeight: number,
    private groundFill: number = 0x5a4631,
    private groundTop: number = 0x6b8e23,
    private opts: TerrainOpts = {},
  ) {
    this.totalWidth = distanceM * RUN.pxPerMetre + 1600;
    this.baseY = worldHeight * 0.6;
    this.generate(roughness);
    this.draw();
    this.buildBodies();
  }

  private isGapX(x: number): boolean {
    const g = this.opts.gaps;
    if (!g) return false;
    for (const [a, b] of g) if (x >= a && x <= b) return true;
    return false;
  }

  private generate(roughness: number) {
    const n = Math.ceil(this.totalWidth / this.step) + 1;
    const minY = this.worldHeight * 0.3;
    const maxY = this.worldHeight * 0.82;
    let slopeAccum = 0;
    let prevJitter = 0;
    for (let i = 0; i < n; i++) {
      const x = i * this.step;
      if (x < 460) {
        this.heights.push(this.baseY);
        this.gapFlags.push(false);
        continue;
      }
      if (this.isGapX(x)) {
        this.heights.push(GAP_Y);
        this.gapFlags.push(true);
        continue;
      }
      const rough = this.opts.roughAt ? this.opts.roughAt(x) : roughness;
      slopeAccum += (this.opts.slopeAt ? this.opts.slopeAt(x) : 0) * this.step;
      const a = Math.sin(x * 0.0016) * 70;
      const b = Math.sin(x * 0.0041 + 1.3) * 38;
      const c = Math.sin(x * 0.011 + 0.6) * 16;
      prevJitter = prevJitter * 0.6 + (Math.random() - 0.5) * 8;
      const noise = (a + b + c + prevJitter) * rough;
      const h = Phaser.Math.Clamp(this.baseY + slopeAccum + noise, minY, maxY);
      this.heights.push(h);
      this.gapFlags.push(false);
    }
    // Flatten the final stretch for a clean evac pad (skip if it's a gap).
    for (let i = Math.max(0, this.heights.length - 10); i < this.heights.length; i++) {
      if (!this.gapFlags[i]) this.heights[i] = this.heights[Math.max(0, this.heights.length - 11)];
    }
  }

  /** Surface Y at world-x (returns a huge value over gaps). */
  heightAt(x: number): number {
    const fx = Phaser.Math.Clamp(x / this.step, 0, this.heights.length - 1);
    const i = Math.floor(fx);
    const a = this.heights[i];
    const b = this.heights[Math.min(i + 1, this.heights.length - 1)];
    if (a >= GAP_Y || b >= GAP_Y) return GAP_Y;
    const t = fx - i;
    return a + (b - a) * t;
  }

  isGap(x: number): boolean {
    return this.heightAt(x) >= GAP_Y;
  }

  private draw() {
    const g = this.scene.add.graphics();
    g.setDepth(-5);
    const n = this.heights.length;
    let i = 0;
    while (i < n) {
      if (this.gapFlags[i]) {
        i++;
        continue;
      }
      let j = i;
      while (j < n && !this.gapFlags[j]) j++;
      // Filled silhouette for this contiguous run.
      g.fillStyle(this.groundFill, 1);
      g.beginPath();
      g.moveTo(i * this.step, this.worldHeight);
      for (let k = i; k < j; k++) g.lineTo(k * this.step, this.heights[k]);
      g.lineTo((j - 1) * this.step, this.worldHeight);
      g.closePath();
      g.fillPath();
      // Surface highlight line.
      g.lineStyle(5, this.groundTop, 1);
      g.beginPath();
      g.moveTo(i * this.step, this.heights[i]);
      for (let k = i + 1; k < j; k++) g.lineTo(k * this.step, this.heights[k]);
      g.strokePath();
      i = j;
    }
  }

  private buildBodies() {
    const M = (this.scene as Phaser.Scene & { matter: Phaser.Physics.Matter.MatterPhysics }).matter;
    for (let i = 0; i < this.heights.length - 1; i++) {
      if (this.gapFlags[i] || this.gapFlags[i + 1]) continue;
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
        restitution: 0,
      });
      body.label = 'terrain';
    }
  }
}
