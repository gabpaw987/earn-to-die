import Phaser from 'phaser';
import { CAT } from '../config';

export type ZombieType = 'walker' | 'brute' | 'crawler';

/** Per-type tuning table. */
interface ZombieStats {
  textureKey: string;
  /** On-screen height in px the art is scaled to (body scales with it). */
  targetH: number;
  density: number;
  health: number;
  cashValue: number;
  /** Multiplier on splatter fling velocity — heavy brutes barely move. */
  flingScale: number;
}

const STATS: Record<ZombieType, ZombieStats> = {
  walker: { textureKey: 'tex-zombie', targetH: 82, density: 0.0006, health: 1, cashValue: 7, flingScale: 1.0 },
  brute: { textureKey: 'tex-zombie-brute', targetH: 132, density: 0.0024, health: 3, cashValue: 24, flingScale: 0.4 },
  crawler: { textureKey: 'tex-zombie-crawler', targetH: 52, density: 0.0004, health: 1, cashValue: 11, flingScale: 1.25 },
};

/**
 * A horde unit that ragdolls when smacked by the car. Three flavours: walker
 * (baseline), brute (tanky, barely budges), crawler (small, fast, worth more).
 * The art sprite is scaled to a target on-screen height; the Matter body scales
 * with it, so the hitbox always matches what you see.
 */
export class Zombie {
  readonly sprite: Phaser.Physics.Matter.Sprite;
  readonly type: ZombieType;
  readonly cashValue: number;
  dead = false;

  private health: number;
  private readonly flingScale: number;

  constructor(scene: Phaser.Scene, x: number, groundY: number, type: ZombieType = 'walker') {
    this.type = type;
    const stats = STATS[type];
    this.health = stats.health;
    this.cashValue = stats.cashValue;
    this.flingScale = stats.flingScale;

    this.sprite = scene.matter.add.sprite(x, groundY, stats.textureKey, undefined, {
      label: `zombie-${type}`,
      density: stats.density,
      friction: 0.4,
      frictionAir: 0.02,
      collisionFilter: { category: CAT.zombie, mask: CAT.terrain | CAT.car },
    });

    // Scale art (and its hitbox) to the desired on-screen height, then rest the
    // feet on the ground line.
    const srcH = this.sprite.height || stats.targetH;
    this.sprite.setScale(stats.targetH / srcH);
    this.sprite.setPosition(x, groundY - this.sprite.displayHeight * 0.5 + 4);

    this.sprite.setFixedRotation();
    this.sprite.setDepth(6);

    const body = this.sprite.body as MatterJS.BodyType;
    body.gameObject = this.sprite;
    this.sprite.setData('zombie', this);
  }

  /** Returns true only on the killing hit; no-op if already dead. */
  hit(dmg: number): boolean {
    if (this.dead) return false;
    this.health -= dmg;
    return this.health <= 0;
  }

  /** Ragdoll the corpse: stop colliding with the car, fling, spin, fade, destroy. */
  splatter(scene: Phaser.Scene, dir: number): void {
    if (this.dead) return;
    this.dead = true;

    const body = this.sprite.body as MatterJS.BodyType;
    body.collisionFilter.mask = CAT.terrain;
    this.sprite.setTint(0x8b3a3a);
    this.sprite.setFixedRotation();
    this.sprite.setStatic(false);

    const sign = dir >= 0 ? 1 : -1;
    const vx = sign * (5 + Math.random() * 2) * this.flingScale;
    const vy = -(4 + Math.random() * 3) * this.flingScale;
    scene.matter.body.setVelocity(body, { x: vx, y: vy });
    this.sprite.setAngularVelocity(sign * 0.4 * this.flingScale);

    scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 700,
      delay: 250,
      ease: 'Quad.in',
      onComplete: () => this.sprite.destroy(),
    });
  }
}
