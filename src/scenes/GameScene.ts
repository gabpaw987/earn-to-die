import Phaser from 'phaser';
import { CAT, COMBO, FUEL, GAME, REWARD, RUN, SCENES, STUNT, TEX } from '../config';
import { STAGES, type Stage } from '../data/levels';
import { Save } from '../state/SaveManager';
import { Terrain } from '../objects/Terrain';
import { Car, type CarControls } from '../objects/Car';
import { Zombie, type ZombieType } from '../objects/Zombie';
import { Obstacle, type ObstacleKind } from '../objects/Obstacle';
import { Pickup } from '../objects/Pickup';
import { Parallax } from '../objects/Parallax';
import { Fx } from '../fx/Fx';
import { Sfx } from '../audio/Sfx';
import type { RunResult } from '../types';

interface HudState {
  fuelPct: number;
  distanceM: number;
  targetM: number;
  cash: number;
  speed: number;
  boost: number;
  stageName: string;
  combo: number;
  comboMult: number;
}

const WORLD_H = 900;

export class GameScene extends Phaser.Scene {
  private stageIndex = 0;
  private stage!: Stage;
  private terrain!: Terrain;
  private car!: Car;
  private parallax!: Parallax;
  private fx!: Fx;

  private zombies: Zombie[] = [];
  private obstacles: Obstacle[] = [];
  private pickups: Pickup[] = [];

  private startX = 0;
  private evacX = 0;
  private maxProgressX = 0;
  private stallTimer = 0;
  private ended = false;

  private kills = 0;
  private bagCash = 0;

  // Combo state
  private combo = 0;
  private comboTimer = 0;
  private maxCombo = 0;

  // Stunt state
  private wasGrounded = true;
  private airMs = 0;
  private accumRotation = 0;
  private lastAngle = 0;
  private prevVy = 0;
  private stunts = 0;

  // particle throttles
  private exhaustAcc = 0;
  private dustAcc = 0;

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
    this.obstacles = [];
    this.pickups = [];
    this.kills = 0;
    this.bagCash = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.stallTimer = 0;
    this.ended = false;
    this.fireTimer = 0;
    this.wasGrounded = true;
    this.airMs = 0;
    this.accumRotation = 0;
    this.prevVy = 0;
    this.stunts = 0;
    this.exhaustAcc = 0;
    this.dustAcc = 0;
  }

  create() {
    this.stage = STAGES[this.stageIndex];
    const theme = this.stage.theme;

    this.parallax = new Parallax(this, theme, GAME.width, GAME.height);
    this.fx = new Fx(this);

    this.terrain = new Terrain(
      this,
      this.stage.distanceM,
      this.stage.roughness,
      WORLD_H,
      theme.groundFill,
      theme.groundTop,
    );

    this.startX = 300;
    this.evacX = this.startX + this.stage.distanceM * RUN.pxPerMetre;
    this.maxProgressX = this.startX;

    const spawnY = this.terrain.heightAt(this.startX) - 80;
    this.car = new Car(this, this.startX, spawnY, Save.stats(), this.terrain);
    this.lastAngle = this.car.angleDeg;

    this.spawnHorde();
    this.spawnObstacles();
    this.placeEvac();

    this.matter.world.setBounds(0, -1200, this.terrain.totalWidth, WORLD_H + 1400);
    const cam = this.cameras.main;
    cam.setBounds(0, -600, this.terrain.totalWidth, WORLD_H + 600);
    cam.startFollow(this.car.chassis, true, 0.12, 0.12);
    cam.setFollowOffset(-180, 60);
    cam.setZoom(0.85);

    this.setupInput();
    this.setupCollisions();

    // Audio
    Sfx.resume();
    Sfx.setMuted(Save.muted);
    Sfx.startEngine();

    // Engine sound follows scene pause/resume + shutdown.
    this.events.on(Phaser.Scenes.Events.PAUSE, () => Sfx.stopEngine());
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      if (!this.ended) Sfx.startEngine();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      Sfx.stopEngine();
      this.parallax.destroy();
    });

    this.scene.launch(SCENES.Ui);
    this.scene.bringToTop(SCENES.Ui);
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
    const pause = () => {
      if (this.ended || this.scene.isPaused()) return;
      Sfx.ui();
      this.scene.launch(SCENES.Pause, { stageIndex: this.stageIndex });
      this.scene.pause();
    };
    kb.on('keydown-ESC', pause);
    kb.on('keydown-P', pause);
  }

  private pickType(): ZombieType {
    const r = Math.random();
    if (r < this.stage.brutePct) return 'brute';
    if (r < this.stage.brutePct + this.stage.crawlerPct) return 'crawler';
    return 'walker';
  }

  private spawnHorde() {
    const { distanceM, zombieDensity } = this.stage;
    const count = Math.floor((distanceM / 100) * zombieDensity);
    for (let i = 0; i < count; i++) {
      const m = 150 + Math.random() * (distanceM - 150);
      const x = this.startX + m * RUN.pxPerMetre;
      this.zombies.push(new Zombie(this, x, this.terrain.heightAt(x), this.pickType()));
    }
  }

  private spawnObstacles() {
    const { distanceM, obstacleDensity } = this.stage;
    const count = Math.floor((distanceM / 100) * obstacleDensity);
    for (let i = 0; i < count; i++) {
      const m = 120 + Math.random() * (distanceM - 130);
      const x = this.startX + m * RUN.pxPerMetre;
      // Weighted: ramps are fun so a bit more common; rocks rarer (they hurt).
      const roll = Math.random();
      const kind: ObstacleKind = roll < 0.45 ? 'ramp' : roll < 0.8 ? 'wreck' : 'rock';
      this.obstacles.push(new Obstacle(this, x, this.terrain.heightAt(x), kind));
    }
    // Fuel cans + cash bags.
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
    const src = this.textures.get(TEX.evac).getSourceImage() as { width: number; height: number };
    const evac = this.add.image(this.evacX, y - 110, TEX.evac).setDepth(5);
    if (src.width > 120) evac.setDisplaySize(260, 260 * (src.height / src.width));
    this.add
      .text(this.evacX, y - 190, 'EVAC', { fontFamily: 'Impact', fontSize: '34px', color: '#2ecc71' })
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

  private comboMult(): number {
    return Phaser.Math.Clamp(1 + (this.combo - 1) * COMBO.step, 1, COMBO.maxMult);
  }

  private registerKill(z: Zombie) {
    this.combo++;
    this.comboTimer = COMBO.windowMs;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.kills++;
    const cash = Math.round(z.cashValue * this.comboMult() * this.stage.cashMult);
    this.bagCash += cash;
    this.fx.blood(z.sprite.x, z.sprite.y, this.car.speed >= 0 ? 1 : -1);
    this.fx.popup(z.sprite.x, z.sprite.y - 20, `+$${cash}`);
    Sfx.splat();
    if (this.combo >= 3 && this.combo % 2 === 1) {
      this.fx.combo(this.car.x, this.car.y - 90, this.combo);
    }
  }

  /** `a` is the candidate car/bullet part, `b` the thing it hit. */
  private handlePair(a: MatterJS.BodyType, b: MatterJS.BodyType) {
    const aIsCar = a.label === 'car-chassis' || a.label === 'car-wheel';
    const aIsBullet = a.label === 'bullet';

    // Zombies
    if ((aIsCar || aIsBullet) && b.label?.startsWith('zombie')) {
      const z = (b.gameObject as Phaser.GameObjects.GameObject | undefined)?.getData('zombie') as
        | Zombie
        | undefined;
      if (z && !z.dead) {
        const dmg = aIsBullet ? 1 : Math.abs(this.car.speed) > 6 ? 3 : 1;
        const killed = z.hit(dmg);
        if (killed) {
          z.splatter(this, this.car.speed >= 0 ? 1 : -1);
          this.registerKill(z);
          if (aIsCar) this.car.applyZombieDrag();
        } else {
          // Wounded / bogged down.
          if (aIsCar) this.car.applyZombieDrag();
          Sfx.hit();
        }
        if (aIsBullet) (a.gameObject as Phaser.GameObjects.GameObject | undefined)?.destroy();
      }
      return;
    }

    // Obstacles (only the car interacts meaningfully)
    if (aIsCar && b.label?.startsWith('obstacle')) {
      const o = (b.gameObject as Phaser.GameObjects.GameObject | undefined)?.getData('obstacle') as
        | Obstacle
        | undefined;
      if (!o) return;
      const fast = Math.abs(this.car.speed) > 5;
      if (o.kind === 'wreck' && !o.smashed) {
        if (fast) {
          o.smash(this, this.car.speed >= 0 ? 1 : -1);
          const cash = Math.round(o.cashValue * this.stage.cashMult);
          this.bagCash += cash;
          this.fx.sparks(o.sprite.x, o.sprite.y);
          this.fx.popup(o.sprite.x, o.sprite.y - 20, `+$${cash}`, '#ffd23b');
          this.fx.shake(120, 0.006);
          Sfx.hit();
        } else {
          Sfx.hit();
        }
      } else if (o.kind === 'rock') {
        this.fx.sparks(this.car.x + 40, this.car.y);
        this.fx.shake(160, 0.01);
        Sfx.hit();
      }
      return;
    }

    // Pickups
    if (aIsCar && (b.label === 'pickup-fuel' || b.label === 'pickup-cash')) {
      const p = (b.gameObject as Phaser.GameObjects.GameObject | undefined)?.getData('pickup') as
        | Pickup
        | undefined;
      if (p && !p.taken) {
        p.collect();
        if (p.kind === 'fuel') {
          this.car.fuel = Math.min(this.car.maxFuel, this.car.fuel + FUEL.fuelCanRestore);
          this.fx.popup(this.car.x, this.car.y - 70, '+FUEL', '#2ecc71');
          Sfx.fuel();
        } else {
          this.bagCash += REWARD.cashBagValue;
          this.fx.popup(this.car.x, this.car.y - 70, `+$${REWARD.cashBagValue}`);
          Sfx.coin();
        }
      }
    }
  }

  private fireWeapon(level: number, dt: number) {
    this.fireTimer -= dt;
    if (!this.keys.space.isDown || this.fireTimer > 0) return;
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
    const sp = 18;
    this.matter.body.setVelocity(bullet.body as MatterJS.BodyType, {
      x: Math.cos(m.angle) * sp,
      y: Math.sin(m.angle) * sp,
    });
    this.fx.flash(0xffffaa, 40);
    Sfx.shoot();
    this.time.delayedCall(800, () => bullet.active && bullet.destroy());
  }

  private updateStunts(delta: number) {
    const grounded = this.car.grounded();
    const angle = this.car.angleDeg;

    if (!grounded) {
      this.airMs += delta;
      this.accumRotation += Phaser.Math.Angle.WrapDegrees(angle - this.lastAngle);
    }
    this.lastAngle = angle;

    // Just landed.
    if (grounded && !this.wasGrounded) {
      const intensity = Phaser.Math.Clamp(this.prevVy / 18, 0, 1);
      Sfx.land(intensity);
      if (intensity > 0.25) {
        this.fx.dust(this.car.x, this.car.y + 30, this.car.speed >= 0 ? 1 : -1);
        if (intensity > 0.6) this.fx.shake(120, 0.006 * intensity);
      }
      // Reward stunts.
      const rot = Math.abs(this.accumRotation);
      if (rot >= STUNT.flipDegrees) {
        const flips = Math.floor(rot / 360) || 1;
        const cash = STUNT.flipCash * flips;
        this.bagCash += Math.round(cash * this.stage.cashMult);
        this.stunts++;
        this.fx.popup(this.car.x, this.car.y - 100, `FLIP! +$${cash}`, '#ff8c00');
        Sfx.stunt();
      } else if (this.airMs >= STUNT.bigAirMs) {
        const cash = STUNT.bigAirCash;
        this.bagCash += Math.round(cash * this.stage.cashMult);
        this.stunts++;
        this.fx.popup(this.car.x, this.car.y - 100, `BIG AIR! +$${cash}`, '#5dade2');
        Sfx.stunt();
      }
      this.airMs = 0;
      this.accumRotation = 0;
    }

    this.prevVy = this.car.vy;
    this.wasGrounded = grounded;
  }

  update(_time: number, delta: number) {
    if (this.ended) return;

    const controls: CarControls = {
      throttle: this.keys.right.isDown || this.keys.d.isDown,
      brake: this.keys.left.isDown || this.keys.a.isDown,
      boost: false,
    };
    // Edge-trigger boost so a held SHIFT doesn't dump every charge instantly.
    const boostPressed = Phaser.Input.Keyboard.JustDown(this.keys.shift);
    if (boostPressed && this.car.tryBoost()) {
      Sfx.boost();
      this.fx.flash(0x66ccff, 120);
      this.fx.shake(160, 0.006);
    }

    this.car.update(delta, controls);

    // Engine audio
    const maxSpeedApprox = 9 + Save.stats().engine * 4.5;
    Sfx.setEngine(controls.throttle, Phaser.Math.Clamp(Math.abs(this.car.speed) / maxSpeedApprox, 0, 1));

    // Weapon
    const stats = Save.stats();
    if (stats.weaponLevel > 0) this.fireWeapon(stats.weaponLevel, delta);

    // Particle feedback
    const grounded = this.car.grounded();
    if (controls.throttle && this.car.fuel > 0) {
      this.exhaustAcc += delta;
      if (this.exhaustAcc > 55) {
        this.exhaustAcc = 0;
        const a = Phaser.Math.DegToRad(this.car.angleDeg);
        this.fx.exhaust(this.car.x - Math.cos(a) * 70, this.car.y - Math.sin(a) * 70 - 6, a + Math.PI);
      }
    }
    if (grounded && Math.abs(this.car.speed) > 3) {
      this.dustAcc += delta;
      if (this.dustAcc > 80) {
        this.dustAcc = 0;
        this.fx.dust(this.car.x - 40, this.car.y + 32, this.car.speed >= 0 ? -1 : 1);
      }
    }

    // Combo decay
    if (this.combo > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    this.updateStunts(delta);

    // Progress / stall tracking
    this.maxProgressX = Math.max(this.maxProgressX, this.car.x);
    const movingForward = this.car.x > this.maxProgressX - 2;
    const slow = Math.abs(this.car.speed) < 0.6;
    const upsideDown = Math.abs(Phaser.Math.Angle.WrapDegrees(this.car.angleDeg)) > 115;
    const dead = this.car.isOutOfFuel() || upsideDown;
    if (slow && dead && !movingForward) this.stallTimer += delta;
    else this.stallTimer = Math.max(0, this.stallTimer - delta * 0.5);

    if (this.car.y > WORLD_H + 600) {
      this.endRun(false);
      return;
    }
    if (this.car.x >= this.evacX) {
      this.endRun(true);
      return;
    }
    if (this.stallTimer > RUN.stallWindowMs) this.endRun(false);

    this.emitHud();
  }

  private emitHud() {
    const distanceM = Math.max(0, (this.car.x - this.startX) / RUN.pxPerMetre);
    const liveCash = this.bagCash;
    const hud: HudState = {
      fuelPct: this.car.fuel / this.car.maxFuel,
      distanceM,
      targetM: this.stage.distanceM,
      cash: Math.round(liveCash),
      speed: Math.abs(this.car.speed),
      boost: this.car.boostCharges,
      stageName: this.stage.name,
      combo: this.combo,
      comboMult: this.comboMult(),
    };
    this.game.events.emit('hud', hud);
  }

  private endRun(reachedEvac: boolean) {
    if (this.ended) return;
    this.ended = true;
    Sfx.stopEngine();

    const distanceM = Math.max(0, (this.car.x - this.startX) / RUN.pxPerMetre);
    const distanceCash = Math.round(distanceM * REWARD.cashPerMetre * this.stage.cashMult);
    const cashCollected = this.bagCash + distanceCash;

    Save.addCash(cashCollected);
    Save.recordRun(this.stageIndex, distanceM, this.kills, this.maxCombo, this.stunts);
    if (reachedEvac && this.stageIndex + 1 < STAGES.length) {
      Save.unlockStage(this.stageIndex + 1);
    }
    if (reachedEvac) Sfx.win();
    else Sfx.lose();

    const result: RunResult = {
      stageIndex: this.stageIndex,
      distanceM: Math.round(distanceM),
      kills: this.kills,
      cashCollected,
      reachedEvac,
      maxCombo: this.maxCombo,
      stunts: this.stunts,
    };

    this.scene.stop(SCENES.Ui);
    this.scene.start(SCENES.Result, result);
  }
}
