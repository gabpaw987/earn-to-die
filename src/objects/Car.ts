import Phaser from 'phaser';
import { CAT, FUEL, PHYSICS, TEX } from '../config';
import type { CarStats } from '../types';
import type { Terrain } from './Terrain';

export interface CarControls {
  throttle: boolean; // right / D
  brake: boolean; // left / A
  boost: boolean; // shift
}

/**
 * The player's rig: a Matter compound built from a chassis sprite and two
 * wheel sprites pinned by stiff distance constraints (acting as axles +
 * light suspension). Driven by applying torque to the wheels on the ground,
 * and torque to the chassis for flip control in the air.
 */
export class Car {
  readonly chassis: Phaser.Physics.Matter.Sprite;
  readonly wheels: Phaser.Physics.Matter.Sprite[] = [];

  fuel: number;
  readonly maxFuel: number;
  boostCharges: number;
  private boostCooldown = 0;

  private readonly stats: CarStats;

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

    // Chassis
    this.chassis = M.add.sprite(x, y, TEX.chassis, undefined, {
      label: 'car-chassis',
      friction: 0.05,
      frictionAir: 0.01,
      density: 0.0016,
      collisionFilter: { category: CAT.car, mask: CAT.terrain | CAT.zombie | CAT.pickup },
    });
    this.chassis.setDepth(10);

    // Wheel mount offsets relative to chassis center.
    const mounts = [
      { x: -48, y: 24 }, // rear
      { x: 50, y: 24 }, // front
    ];

    for (const m of mounts) {
      const wheel = M.add.sprite(x + m.x, y + m.y, TEX.wheel, undefined, {
        label: 'car-wheel',
        shape: { type: 'circle', radius: 28 },
        friction: 0.95,
        frictionStatic: 1.2,
        frictionAir: 0.005,
        density: 0.0012,
        collisionFilter: { category: CAT.car, mask: CAT.terrain },
      });
      wheel.setDepth(9);
      this.wheels.push(wheel);

      // Stiff length-0 constraint = axle with a touch of spring.
      M.add.constraint(
        this.chassis.body as MatterJS.BodyType,
        wheel.body as MatterJS.BodyType,
        0,
        0.7,
        { pointA: { x: m.x, y: m.y }, damping: 0.1 },
      );
    }
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

  /** Forward (world) speed in px/step, signed. */
  get speed() {
    return (this.chassis.body as MatterJS.BodyType).velocity.x;
  }

  isOutOfFuel() {
    return this.fuel <= 0;
  }

  /** Is at least one wheel touching/near the ground? */
  private grounded(): boolean {
    for (const w of this.wheels) {
      const surf = this.terrain.heightAt(w.x);
      if (w.y + 28 >= surf - 6) return true;
    }
    return false;
  }

  /** World position of the roof gun muzzle (front-top of chassis). */
  muzzle(): { x: number; y: number; angle: number } {
    const a = Phaser.Math.DegToRad(this.chassis.angle);
    const ox = 64;
    const oy = -22;
    return {
      x: this.chassis.x + Math.cos(a) * ox - Math.sin(a) * oy,
      y: this.chassis.y + Math.sin(a) * ox + Math.cos(a) * oy,
      angle: a,
    };
  }

  tryBoost(): boolean {
    if (this.boostCharges <= 0 || this.boostCooldown > 0) return false;
    this.boostCharges--;
    this.boostCooldown = 800;
    const a = Phaser.Math.DegToRad(this.chassis.angle);
    const force = 0.9;
    this.chassis.applyForce(new Phaser.Math.Vector2(Math.cos(a) * force * 0.06, Math.sin(a) * force * 0.06 - 0.03));
    return true;
  }

  /** Apply one zombie-cluster drag tick (called by GameScene on contact). */
  applyZombieDrag() {
    const body = this.chassis.body as MatterJS.BodyType;
    const keep = PHYSICS.zombieDrag + (1 - PHYSICS.zombieDrag) * this.stats.armor;
    this.scene.matter.body.setVelocity(body, {
      x: body.velocity.x * keep,
      y: body.velocity.y,
    });
  }

  update(dtMs: number, controls: CarControls) {
    const dt = dtMs / 1000;
    if (this.boostCooldown > 0) this.boostCooldown -= dtMs;

    // Fuel
    this.fuel -= FUEL.idleDrainPerSec * dt;
    const wantsDrive = (controls.throttle || controls.brake) && this.fuel > 0;
    if (wantsDrive && controls.throttle) this.fuel -= FUEL.throttleDrainPerSec * dt;
    if (this.fuel < 0) this.fuel = 0;

    const onGround = this.grounded();
    const driveTorque = PHYSICS.wheelBaseTorque * this.stats.engine * this.stats.wheels;
    const maxSpeed = 9 + this.stats.engine * 4.5;

    if (this.fuel > 0) {
      if (onGround) {
        // Spin the wheels.
        if (controls.throttle && this.speed < maxSpeed) {
          for (const w of this.wheels) (w.body as MatterJS.BodyType).torque = driveTorque;
        } else if (controls.brake && this.speed > -maxSpeed * 0.5) {
          for (const w of this.wheels) (w.body as MatterJS.BodyType).torque = -driveTorque;
        }
      } else {
        // Air control: tilt the chassis.
        const chassis = this.chassis.body as MatterJS.BodyType;
        if (controls.throttle) chassis.torque = PHYSICS.airTorque * 1000;
        else if (controls.brake) chassis.torque = -PHYSICS.airTorque * 1000;
      }
    }

    if (controls.boost) this.tryBoost();

    // Spin wheel sprites are auto-updated by Matter; nothing else needed.
  }

  destroy() {
    this.wheels.forEach((w) => w.destroy());
    this.chassis.destroy();
  }
}
