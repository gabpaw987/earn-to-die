import Phaser from 'phaser';
import { CAT, TEX } from '../config';

export type PickupKind = 'fuel' | 'cash';

/** A collectible sensor body floating just above the terrain. */
export class Pickup {
  readonly sprite: Phaser.Physics.Matter.Sprite;
  taken = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly kind: PickupKind,
  ) {
    const tex = kind === 'fuel' ? TEX.fuelCan : TEX.cashBag;
    this.sprite = scene.matter.add.sprite(x, y - 46, tex, undefined, {
      label: `pickup-${kind}`,
      isSensor: true,
      isStatic: true,
      collisionFilter: { category: CAT.pickup, mask: CAT.car },
    });
    this.sprite.setDepth(7);
    this.sprite.setData('pickup', this);
    // gentle bob
    scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - 8,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  collect() {
    if (this.taken) return;
    this.taken = true;
    this.sprite.destroy();
  }
}
