import Phaser from 'phaser';
import { CAT, TEX } from '../config';

export type PickupKind = 'fuel' | 'cash';

const TARGET_H = 54; // on-screen pickup height

/** A collectible sensor body floating just above the terrain. */
export class Pickup {
  readonly sprite: Phaser.Physics.Matter.Sprite;
  taken = false;
  private bob: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    x: number,
    groundY: number,
    readonly kind: PickupKind,
  ) {
    const tex = kind === 'fuel' ? TEX.fuelCan : TEX.cashBag;
    this.sprite = scene.matter.add.sprite(x, groundY, tex, undefined, {
      label: `pickup-${kind}`,
      isSensor: true,
      isStatic: true,
      collisionFilter: { category: CAT.pickup, mask: CAT.car },
    });
    const srcH = this.sprite.height || TARGET_H;
    this.sprite.setScale(TARGET_H / srcH);
    const restY = groundY - this.sprite.displayHeight * 0.5 - 26;
    this.sprite.setPosition(x, restY);
    this.sprite.setDepth(7);
    this.sprite.setData('pickup', this);
    // gentle bob
    this.bob = scene.tweens.add({
      targets: this.sprite,
      y: restY - 8,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  collect() {
    if (this.taken) return;
    this.taken = true;
    this.bob.remove();
    this.sprite.destroy();
  }
}
