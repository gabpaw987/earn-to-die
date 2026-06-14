import Phaser from 'phaser';
import { CAT, FUEL, PHYSICS, TEX } from '../config';
import { VEHICLE_TEX } from '../data/sprites';
import type { CarStats } from '../types';
import type { Terrain } from './Terrain';

export interface CarControls {
  throttle: boolean; // right / D
  brake: boolean; // left / A
  boost: boolean; // shift
}

const BODY_W = 196; // on-screen body width
const WHEEL_DISP = 72; // on-screen wheel diameter
const CHASSIS_BODY_W = 150;
const CHASSIS_BODY_H = 56;
const WHEEL_R = 28;

/**
 * The player's rig. Physics is a Matter compound (an invisible chassis box +
 * two invisible wheel circles joined by stiff axle constraints). The visible
 * art is decoupled: a body image + two wheel images (which spin) + optional
 * armor plate and roof gun, all glued to the physics bodies each frame. This
 * keeps the hitboxes fixed regardless of sprite resolution and lets the wheels
 * actually rotate.
 */
export class Car {
  readonly chassis: Phaser.Physics.Matter.Sprite;
  readonly wheels: Phaser.Physics.Matter.Sprite[] = [];

  fuel: number;
  readonly maxFuel: number;
  boostCharges: number;
  private boostCooldown = 0;

  private readonly stats: CarStats;
  private readonly mounts = [
    { x: -64, y: 26 }, // rear
    { x: 66, y: 26 }, // front
  ];

  private bodyImg: Phaser.GameObjects.Image;
  private wheelImgs: Phaser.GameObjects.Image[] = [];
  private armorSprite?: Phaser.GameObjects.Image;
  private gunSprite?: Phaser.GameObjects.Image;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    stats: CarStats,
    private terrain: Terrain,
  ) {
    this.stats = stats;
    this.maxFuel = stats.maxFuel;
    this.fuel = stats.maxFuel;
    this.boostCharges = stats.boosterCharges;

    const M = this.scene.matter;

    // Invisible physics chassis (fixed box, never scaled).
    this.chassis = M.add.sprite(x, y, TEX.chassis, undefined, {
      label: 'car-chassis',
      shape: { type: 'rectangle', width: CHASSIS_BODY_W, height: CHASSIS_BODY_H },
      friction: 0.05,
      frictionAir: 0.01,
      density: 0.0016 * stats.mass,
      collisionFilter: { category: CAT.car, mask: CAT.terrain | CAT.zombie | CAT.pickup },
    });
    this.chassis.setVisible(false);
    this.chassis.setDepth(10);

    // Invisible physics wheels (fixed circles, never scaled).
    for (const m of this.mounts) {
      const wheel = M.add.sprite(x + m.x, y + m.y, TEX.chassis, undefined, {
        label: 'car-wheel',
        shape: { type: 'circle', radius: WHEEL_R },
        friction: 0.95,
        frictionStatic: 1.2,
        frictionAir: 0.005,
        density: 0.0012,
        collisionFilter: { category: CAT.car, mask: CAT.terrain },
      });
      wheel.setVisible(false);
      this.wheels.push(wheel);
      M.add.constraint(
        this.chassis.body as MatterJS.BodyType,
        wheel.body as MatterJS.BodyType,
        0,
        0.7,
        { pointA: { x: m.x, y: m.y }, damping: 0.1 },
      );
    }

    // --- Visible art (decoupled overlays) ---
    const bodyKey = VEHICLE_TEX[stats.vehicleKey] ?? TEX.chassis;
    const useArt = scene.textures.exists(bodyKey) && bodyKey !== TEX.chassis;
    this.bodyImg = scene.add.image(x, y, useArt ? bodyKey : TEX.chassis).setDepth(10);
    if (useArt) {
      const f = scene.textures.get(bodyKey).getSourceImage();
      const aspect = f.height / f.width;
      this.bodyImg.setDisplaySize(BODY_W, BODY_W * aspect);
    } else {
      this.bodyImg.setDisplaySize(170, 72).setTint(stats.chassisColor);
    }

    for (let i = 0; i < this.mounts.length; i++) {
      const wImg = scene.add.image(x, y, TEX.wheel).setDepth(9);
      wImg.setDisplaySize(WHEEL_DISP, WHEEL_DISP);
      this.wheelImgs.push(wImg);
    }

    if (stats.armor > 0) {
      this.armorSprite = scene.add.image(x, y, TEX.armorPlate).setDepth(11);
      const f = scene.textures.get(TEX.armorPlate).getSourceImage();
      this.armorSprite.setDisplaySize(96, 96 * (f.height / f.width));
    }
    if (stats.weaponLevel > 0) {
      this.gunSprite = scene.add.image(x, y, TEX.gun).setDepth(12).setOrigin(0.4, 0.7);
      const f = scene.textures.get(TEX.gun).getSourceImage();
      this.gunSprite.setDisplaySize(70, 70 * (f.height / f.width));
    }

    this.syncArt();
  }

  get x() {
    return this.chassis.x;
  }
  get y() {
    return this.chassis.y;
  }
  get angleDeg() {
    return this.chassis.angle;
  }
  get speed() {
    return (this.chassis.body as MatterJS.BodyType).velocity.x;
  }
  get vy() {
    return (this.chassis.body as MatterJS.BodyType).velocity.y;
  }

  isOutOfFuel() {
    return this.fuel <= 0;
  }

  grounded(): boolean {
    for (const w of this.wheels) {
      const surf = this.terrain.heightAt(w.x);
      if (w.y + WHEEL_R >= surf - 6) return true;
    }
    return false;
  }

  private place(ox: number, oy: number): { x: number; y: number } {
    const a = Phaser.Math.DegToRad(this.chassis.angle);
    return {
      x: this.chassis.x + Math.cos(a) * ox - Math.sin(a) * oy,
      y: this.chassis.y + Math.sin(a) * ox + Math.cos(a) * oy,
    };
  }

  muzzle(): { x: number; y: number; angle: number } {
    const p = this.place(82, -24);
    return { x: p.x, y: p.y, angle: Phaser.Math.DegToRad(this.chassis.angle) };
  }

  tryBoost(): boolean {
    if (this.boostCharges <= 0 || this.boostCooldown > 0) return false;
    this.boostCharges--;
    this.boostCooldown = 800;
    const a = Phaser.Math.DegToRad(this.chassis.angle);
    this.chassis.applyForce(
      new Phaser.Math.Vector2(Math.cos(a) * 0.054, Math.sin(a) * 0.054 - 0.03),
    );
    return true;
  }

  applyZombieDrag() {
    const body = this.chassis.body as MatterJS.BodyType;
    const keep = PHYSICS.zombieDrag + (1 - PHYSICS.zombieDrag) * this.stats.armor;
    this.scene.matter.body.setVelocity(body, { x: body.velocity.x * keep, y: body.velocity.y });
  }

  /** Glue every visible overlay to its physics body. */
  private syncArt() {
    const rad = Phaser.Math.DegToRad(this.chassis.angle);
    this.bodyImg.setPosition(this.chassis.x, this.chassis.y).setRotation(rad);
    for (let i = 0; i < this.wheels.length; i++) {
      const w = this.wheels[i];
      this.wheelImgs[i].setPosition(w.x, w.y).setRotation(Phaser.Math.DegToRad(w.angle));
    }
    if (this.armorSprite) {
      const p = this.place(70, 18);
      this.armorSprite.setPosition(p.x, p.y).setRotation(rad);
    }
    if (this.gunSprite) {
      const p = this.place(6, -30);
      this.gunSprite.setPosition(p.x, p.y).setRotation(rad);
    }
  }

  update(dtMs: number, controls: CarControls) {
    const dt = dtMs / 1000;
    if (this.boostCooldown > 0) this.boostCooldown -= dtMs;

    this.fuel -= FUEL.idleDrainPerSec * dt;
    const wantsDrive = (controls.throttle || controls.brake) && this.fuel > 0;
    if (wantsDrive && controls.throttle) this.fuel -= FUEL.throttleDrainPerSec * dt;
    if (this.fuel < 0) this.fuel = 0;

    const onGround = this.grounded();
    const driveTorque = PHYSICS.wheelBaseTorque * this.stats.engine * this.stats.wheels;
    const maxSpeed = 7 + this.stats.engine * 3.6;

    if (this.fuel > 0) {
      if (onGround) {
        if (controls.throttle && this.speed < maxSpeed) {
          for (const w of this.wheels) (w.body as MatterJS.BodyType).torque = driveTorque;
        } else if (controls.brake && this.speed > -maxSpeed * 0.5) {
          for (const w of this.wheels) (w.body as MatterJS.BodyType).torque = -driveTorque;
        }
      } else {
        const chassis = this.chassis.body as MatterJS.BodyType;
        if (controls.throttle) chassis.torque = PHYSICS.airTorque * 1000;
        else if (controls.brake) chassis.torque = -PHYSICS.airTorque * 1000;
      }
    }

    if (controls.boost) this.tryBoost();
    this.syncArt();
  }

  destroy() {
    this.bodyImg.destroy();
    this.wheelImgs.forEach((w) => w.destroy());
    this.armorSprite?.destroy();
    this.gunSprite?.destroy();
    this.wheels.forEach((w) => w.destroy());
    this.chassis.destroy();
  }
}
