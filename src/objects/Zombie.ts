import Phaser from 'phaser';
import { CAT, TEX } from '../config';

/** A single horde unit: a light dynamic body so it ragdolls when smacked. */
export class Zombie {
  readonly sprite: Phaser.Physics.Matter.Sprite;
  dead = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.matter.add.sprite(x, y - 24, TEX.zombie, undefined, {
      label: 'zombie',
      density: 0.0006,
      friction: 0.4,
      frictionAir: 0.02,
      collisionFilter: { category: CAT.zombie, mask: CAT.terrain | CAT.car },
    });
    this.sprite.setFixedRotation();
    this.sprite.setDepth(6);
    (this.sprite.body as MatterJS.BodyType).gameObject = this.sprite;
    // Back-reference for collision lookups.
    this.sprite.setData('zombie', this);
  }

  /** Kill it: fling the sprite, then fade + destroy. Returns once scheduled. */
  splatter(scene: Phaser.Scene, dir: number) {
    if (this.dead) return;
    this.dead = true;
    const body = this.sprite.body as MatterJS.BodyType;
    body.collisionFilter.mask = CAT.terrain; // stop colliding with car
    this.sprite.setTint(0x8b0000);
    scene.matter.body.setVelocity(body, { x: dir * 6, y: -4 - Math.random() * 3 });
    this.sprite.setAngularVelocity(dir * 0.4);
    scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 700,
      delay: 250,
      onComplete: () => this.sprite.destroy(),
    });
  }
}
