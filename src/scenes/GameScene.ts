import Phaser from 'phaser';
import { CAT, GAME, REWARD, RUN, SCENES, TEX } from '../config';
import { STAGES } from '../data/levels';
import { Save } from '../state/SaveManager';
import { Terrain } from '../objects/Terrain';
import { Car, type CarControls } from '../objects/Car';
import { Zombie } from '../objects/Zombie';
import { Pickup } from '../objects/Pickup';
import type { RunResult } from '../types';

interface HudState {
  fuelPct: number;
  distanceM: number;
  targetM: number;
  cash: number;
  speed: number;
  boost: number;
  stageName: string;
}

const WORLD_H = 900;

export class GameScene extends Phaser.Scene {
  private stageIndex = 0;
  private terrain!: Terrain;
  private car!: Car;
  private zombies: Zombie[] = [];
  private pickups: Pickup[] = [];

  private startX = 0;
  private evacX = 0;
  private maxProgressX = 0;
  private stallTimer = 0;
  private ended = false;

  private kills = 0;
  private bagCash = 0;

  private fireTimer = 0;
  private keys!: {
    right: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super(SCENES.Game);
  }

  init(data: { stageIndex?: number }) {
    this.stageIndex = data.stageIndex ?? 0;
    this.zombies = [];
    this.pickups = [];
    this.kills = 0;
    this.bagCash = 0;
    this.stallTimer = 0;
    this.ended = false;
    this.fireTimer = 0;
  }

  create() {
    const stage = STAGES[this.stageIndex];

    this.sky();

    this.terrain = new Terrain(this, stage.distanceM, stage.roughness, WORLD_H);

    this.startX = 300;
    this.evacX = this.startX + stage.distanceM * RUN.pxPerMetre;
    this.maxProgressX = this.startX;

    // Spawn the car on the flat launch pad.
    const spawnY = this.terrain.heightAt(this.startX) - 80;
    this.car = new Car(this, this.startX, spawnY, Save.stats(), this.terrain);

    this.spawnHorde(stage.zombieDensity, stage.distanceM);
    this.spawnPickups(stage.distanceM);
    this.placeEvac();

    // World + camera
    this.matter.world.setBounds(0, -1200, this.terrain.totalWidth, WORLD_H + 1400);
    const cam = this.cameras.main;
    cam.setBounds(0, -600, this.terrain.totalWidth, WORLD_H + 600);
    cam.startFollow(this.car.chassis, true, 0.12, 0.12);
    cam.setFollowOffset(-180, 60);
    cam.setZoom(0.85);

    this.setupInput();
    this.setupCollisions();

    this.scene.launch(SCENES.Ui);
    this.scene.bringToTop(SCENES.Ui);
  }

  private sky() {
    const g = this.add.graphics();
    g.setScrollFactor(0);
    g.setDepth(-100);
    g.fillGradientStyle(0x223344, 0x223344, 0x6b4a3a, 0x8a5a3a, 1);
    g.fillRect(0, 0, GAME.width, GAME.height);
  }

  private setupInput() {
    const kb = this.input.keyboard!;
    this.keys = {
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      shift: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };
    kb.on('keydown-ESC', () => {
      if (!this.ended) this.endRun(false);
    });
  }

  private spawnHorde(densityPer100m: number, distanceM: number) {
    const count = Math.floor((distanceM / 100) * densityPer100m);
    for (let i = 0; i < count; i++) {
      // Avoid the first 150m so the player builds speed first.
      const m = 150 + Math.random() * (distanceM - 150);
      const x = this.startX + m * RUN.pxPerMetre;
      const y = this.terrain.heightAt(x);
      this.zombies.push(new Zombie(this, x, y));
    }
  }

  private spawnPickups(distanceM: number) {
    // A fuel can roughly every 110m, a cash bag every 70m.
    for (let m = 90; m < distanceM; m += 110) {
      const x = this.startX + m * RUN.pxPerMetre;
      this.pickups.push(new Pickup(this, x, this.terrain.heightAt(x), 'fuel'));
    }
    for (let m = 60; m < distanceM; m += 70) {
      const x = this.startX + (m + 12) * RUN.pxPerMetre;
      this.pickups.push(new Pickup(this, x, this.terrain.heightAt(x), 'cash'));
    }
  }

  private placeEvac() {
    const y = this.terrain.heightAt(this.evacX);
    this.add.image(this.evacX, y - 60, TEX.evac).setDepth(5);
    this.add
      .text(this.evacX, y - 130, 'EVAC', {
        fontFamily: 'Impact',
        fontSize: '30px',
        color: '#2ecc71',
      })
      .setOrigin(0.5);
  }

  private setupCollisions() {
    this.matter.world.on(
      'collisionstart',
      (_e: unknown, a: MatterJS.BodyType, b: MatterJS.BodyType) => {
        this.handlePair(a, b);
        this.handlePair(b, a);
      },
    );
  }

  /** `a` is the candidate car/bullet part, `b` the thing it hit. */
  private handlePair(a: MatterJS.BodyType, b: MatterJS.BodyType) {
    const aIsCar = a.label === 'car-chassis' || a.label === 'car-wheel';
    const aIsBullet = a.label === 'bullet';

    if ((aIsCar || aIsBullet) && b.label === 'zombie') {
      const go = b.gameObject as Phaser.GameObjects.GameObject | undefined;
      const z = go?.getData('zombie') as Zombie | undefined;
      if (z && !z.dead) {
        const dir = this.car.speed >= 0 ? 1 : -1;
        z.splatter(this, dir);
        this.kills++;
        if (aIsCar) this.car.applyZombieDrag();
        if (aIsBullet) (a.gameObject as Phaser.GameObjects.GameObject | undefined)?.destroy();
        this.spawnBlood(z.sprite.x, z.sprite.y);
      }
    }

    if (aIsCar && (b.label === 'pickup-fuel' || b.label === 'pickup-cash')) {
      const go = b.gameObject as Phaser.GameObjects.GameObject | undefined;
      const p = go?.getData('pickup') as Pickup | undefined;
      if (p && !p.taken) {
        p.collect();
        if (p.kind === 'fuel') {
          this.car.fuel = Math.min(this.car.maxFuel, this.car.fuel + 28);
        } else {
          this.bagCash += REWARD.cashBagValue;
        }
      }
    }
  }

  private spawnBlood(x: number, y: number) {
    const e = this.add.particles(x, y, TEX.particle, {
      speed: { min: 40, max: 160 },
      angle: { min: 200, max: 340 },
      lifespan: 400,
      quantity: 8,
      scale: { start: 0.8, end: 0 },
      tint: 0x8b0000,
    });
    this.time.delayedCall(450, () => e.destroy());
  }

  private fireWeapon(level: number, dt: number) {
    this.fireTimer -= dt;
    const heldFire = this.keys.space.isDown;
    if (!heldFire || this.fireTimer > 0) return;
    const interval = [0, 380, 200, 90][level] ?? 380;
    this.fireTimer = interval;

    const m = this.car.muzzle();
    const bullet = this.matter.add.sprite(m.x, m.y, TEX.bullet, undefined, {
      label: 'bullet',
      isSensor: true,
      ignoreGravity: true,
      collisionFilter: { category: CAT.bullet, mask: CAT.zombie },
    });
    bullet.setDepth(11);
    bullet.setRotation(m.angle);
    const sp = 16;
    this.matter.body.setVelocity(bullet.body as MatterJS.BodyType, {
      x: Math.cos(m.angle) * sp,
      y: Math.sin(m.angle) * sp,
    });
    this.time.delayedCall(700, () => bullet.active && bullet.destroy());
  }

  update(_time: number, delta: number) {
    if (this.ended) return;

    const controls: CarControls = {
      throttle: this.keys.right.isDown || this.keys.d.isDown,
      brake: this.keys.left.isDown || this.keys.a.isDown,
      boost: this.keys.shift.isDown,
    };
    this.car.update(delta, controls);

    const stats = Save.stats();
    if (stats.weaponLevel > 0) this.fireWeapon(stats.weaponLevel, delta);

    // Progress / stall tracking
    this.maxProgressX = Math.max(this.maxProgressX, this.car.x);
    const movingForward = this.car.x > this.maxProgressX - 2;
    const slow = Math.abs(this.car.speed) < 0.6;
    const upsideDown = Math.abs(Phaser.Math.Angle.WrapDegrees(this.car.angleDeg)) > 115;
    const dead = this.car.isOutOfFuel() || upsideDown;
    if (slow && dead && !movingForward) {
      this.stallTimer += delta;
    } else {
      this.stallTimer = Math.max(0, this.stallTimer - delta * 0.5);
    }

    // Fell off the world
    if (this.car.y > WORLD_H + 600) this.endRun(false);

    // Reached evac?
    if (this.car.x >= this.evacX) {
      this.endRun(true);
      return;
    }

    if (this.stallTimer > RUN.stallWindowMs) this.endRun(false);

    this.emitHud();
  }

  private emitHud() {
    const stage = STAGES[this.stageIndex];
    const distanceM = Math.max(0, (this.car.x - this.startX) / RUN.pxPerMetre);
    const liveCash = this.bagCash + this.kills * REWARD.cashPerZombie * stage.cashMult;
    const hud: HudState = {
      fuelPct: this.car.fuel / this.car.maxFuel,
      distanceM,
      targetM: stage.distanceM,
      cash: Math.round(liveCash),
      speed: Math.abs(this.car.speed),
      boost: this.car.boostCharges,
      stageName: stage.name,
    };
    this.game.events.emit('hud', hud);
  }

  private endRun(reachedEvac: boolean) {
    if (this.ended) return;
    this.ended = true;

    const stage = STAGES[this.stageIndex];
    const distanceM = Math.max(0, (this.car.x - this.startX) / RUN.pxPerMetre);
    const distanceCash = distanceM * REWARD.cashPerMetre * stage.cashMult;
    const zombieCash = this.kills * REWARD.cashPerZombie * stage.cashMult;
    const cashCollected = Math.round(this.bagCash + zombieCash + distanceCash);

    Save.addCash(cashCollected);
    Save.recordRun(this.stageIndex, distanceM, this.kills);
    if (reachedEvac && this.stageIndex + 1 < STAGES.length) {
      Save.unlockStage(this.stageIndex + 1);
    }

    const result: RunResult = {
      stageIndex: this.stageIndex,
      distanceM: Math.round(distanceM),
      kills: this.kills,
      cashCollected,
      reachedEvac,
    };

    this.scene.stop(SCENES.Ui);
    this.scene.start(SCENES.Result, result);
  }
}
