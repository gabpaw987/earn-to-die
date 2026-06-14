import Phaser from 'phaser';
import { CAT } from '../config';

export type ObstacleKind = 'wreck' | 'rock' | 'ramp';

interface ObstacleStats {
  textureKey: string;
  label: string;
  cashValue: number;
  isStatic: boolean;
  /** On-screen width (px) the art is scaled to; the hitbox scales with it. */
  targetW: number;
  density?: number;
}

const STATS: Record<ObstacleKind, ObstacleStats> = {
  wreck: { textureKey: 'tex-wreck', label: 'obstacle-wreck', cashValue: 12, isStatic: false, targetW: 156, density: 0.0085 },
  rock: { textureKey: 'tex-rock', label: 'obstacle-rock', cashValue: 0, isStatic: true, targetW: 92 },
  ramp: { textureKey: 'tex-ramp', label: 'obstacle-ramp', cashValue: 0, isStatic: true, targetW: 172 },
};

/**
 * A world obstacle:
 *  - wreck: dynamic rusted car, smashable at speed (awards cash).
 *  - rock:  static immovable boulder — a hard stop.
 *  - ramp:  static angled launcher (low-left -> high-right) that flings the car.
 * Art is scaled to a target width; the Matter body scales with it.
 */
export class Obstacle {
  readonly sprite: Phaser.Physics.Matter.Sprite;
  readonly kind: ObstacleKind;
  readonly cashValue: number;
  smashed = false;

  constructor(scene: Phaser.Scene, x: number, groundY: number, kind: ObstacleKind) {
    this.kind = kind;
    const stats = STATS[kind];
    this.cashValue = stats.cashValue;

    if (kind === 'ramp') {
      this.sprite = Obstacle.createRamp(scene, x, stats);
    } else {
      this.sprite = scene.matter.add.sprite(x, groundY, stats.textureKey, undefined, {
        label: stats.label,
        isStatic: stats.isStatic,
        density: stats.density,
        friction: 0.5,
        frictionAir: 0.01,
        collisionFilter: { category: CAT.terrain },
      });
    }

    const srcW = this.sprite.width || stats.targetW;
    this.sprite.setScale(stats.targetW / srcW);
    // Rest the base on the ground line.
    this.sprite.setPosition(x, groundY - this.sprite.displayHeight * 0.5 + 6);

    this.sprite.setDepth(5);
    this.sprite.setData('obstacle', this);
  }

  private static createRamp(scene: Phaser.Scene, x: number, stats: ObstacleStats): Phaser.Physics.Matter.Sprite {
    const frame = scene.textures.getFrame(stats.textureKey);
    const w = frame ? frame.width : 160;
    const h = frame ? frame.height : 80;
    // Right-triangle wedge matching the art: low on the LEFT, high on the RIGHT.
    const verts = `0 ${h} ${w} ${h} ${w} 0`;
    const sprite = scene.matter.add.sprite(x, 0, stats.textureKey, undefined, {
      label: stats.label,
      isStatic: true,
      friction: 0.6,
      collisionFilter: { category: CAT.terrain },
      shape: { type: 'fromVerts', verts, flagInternal: true },
    });
    if (!sprite.body) {
      return scene.matter.add.sprite(x, 0, stats.textureKey, undefined, {
        label: stats.label,
        isStatic: true,
        friction: 0.6,
        collisionFilter: { category: CAT.terrain },
      });
    }
    return sprite;
  }

  /** Smash a wreck: weaken collision, fling, tumble, fade. No-op otherwise. */
  smash(scene: Phaser.Scene, dir: number): void {
    if (this.kind !== 'wreck' || this.smashed) return;
    this.smashed = true;
    const body = this.sprite.body as MatterJS.BodyType;
    scene.matter.body.setDensity(body, 0.0005);
    this.sprite.setTint(0x777777);
    const sign = dir >= 0 ? 1 : -1;
    scene.matter.body.setVelocity(body, { x: sign * 5, y: -3 });
    this.sprite.setAngularVelocity(sign * 0.25);
    scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 600,
      delay: 300,
      ease: 'Quad.in',
      onComplete: () => this.sprite.destroy(),
    });
  }
}
