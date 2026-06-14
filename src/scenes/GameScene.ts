import Phaser from 'phaser';
import { CAT, COMBO, FUEL, GAME, REWARD, RUN, SCENES, STUNT, TEX } from '../config';
import { STAGES, type Stage } from '../data/levels';
import { Save } from '../state/SaveManager';
import { Terrain, type TerrainOpts } from '../objects/Terrain';
import { LEVEL_PLANS, SEGMENT_BEHAVIOR, type Segment, type LevelPlan } from '../data/levelPlans';
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

  private segLayout: Array<{ seg: Segment; x0: number; x1: number }> = [];
  private effectiveDistanceM = 0;

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
    this.segLayout = [];
  }

  create() {
    this.stage = STAGES[this.stageIndex];
    const theme = this.stage.theme;

    this.parallax = new Parallax(this, theme, GAME.width, GAME.height);
    this.fx = new Fx(this);

    this.startX = 300;
    const plan = LEVEL_PLANS[this.stageIndex];
    let opts: TerrainOpts = {};
    let distanceM = this.stage.distanceM;
    if (plan) {
      const layout = this.computeLayout(plan);
      this.segLayout = layout.segs;
      distanceM = layout.distanceM;
      opts = layout.opts;
    }
    this.effectiveDistanceM = distanceM;
    this.evacX = this.startX + distanceM * RUN.pxPerMetre;
    this.maxProgressX = this.startX;

    this.terrain = new Terrain(
      this,
      distanceM,
      this.stage.roughness,
      WORLD_H,
      theme.groundFill,
      theme.groundTop,
      opts,
    );

    const spawnY = this.terrain.heightAt(this.startX) - 80;
    this.car = new Car(this, this.startX, spawnY, Save.stats(), this.terrain);
    this.lastAngle = this.car.angleDeg;

    if (plan) this.buildFromPlan();
    else {
      this.spawnHorde();
      this.spawnObstacles();
    }
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

  /** Weighted random pick over a {key: weight} map. */
  private weighted<T extends string>(mix: Record<T, number>): T {
    const keys = Object.keys(mix) as T[];
    let total = 0;
    for (const k of keys) total += mix[k];
    let r = Math.random() * total;
    for (const k of keys) {
      r -= mix[k];
      if (r <= 0) return k;
    }
    return keys[0];
  }

  private placeRamp(x: number) {
    if (this.terrain.isGap(x)) return;
    this.obstacles.push(new Obstacle(this, x, this.terrain.heightAt(x), 'ramp'));
  }

  /** Turn an authored plan into world-x segments + terrain roughness/slope/gaps. */
  private computeLayout(plan: LevelPlan) {
    const px = RUN.pxPerMetre;
    const segs: Array<{ seg: Segment; x0: number; x1: number }> = [];
    const gaps: Array<[number, number]> = [];
    let m = 0;
    for (const seg of plan.segments) {
      const x0 = this.startX + m * px;
      const x1 = this.startX + (m + seg.lengthM) * px;
      segs.push({ seg, x0, x1 });
      if (SEGMENT_BEHAVIOR[seg.type].isGap) {
        const holeW = 120 + seg.intensity * 180;
        const holeStart = x0 + 200;
        const holeEnd = Math.min(holeStart + holeW, x1 - 70);
        if (holeEnd > holeStart + 40) gaps.push([holeStart, holeEnd]);
      }
      m += seg.lengthM;
    }
    const findSeg = (x: number) => {
      for (const s of segs) if (x >= s.x0 && x < s.x1) return s;
      return segs[segs.length - 1];
    };
    const opts: TerrainOpts = {
      roughAt: (x) => {
        const s = findSeg(x);
        const b = SEGMENT_BEHAVIOR[s.seg.type];
        return this.stage.roughness * b.roughMult * (0.6 + 0.7 * s.seg.intensity);
      },
      slopeAt: (x) => SEGMENT_BEHAVIOR[findSeg(x).seg.type].slope * 0.14,
      gaps,
    };
    return { segs, distanceM: m, opts };
  }

  /** Place zombies / obstacles / pickups / ramps per authored segment. */
  private buildFromPlan() {
    for (const { seg, x0, x1 } of this.segLayout) {
      const b = SEGMENT_BEHAVIOR[seg.type];
      const lenM = seg.lengthM;
      if (b.isGap) {
        this.placeRamp(x0 + 60);
        // Reward bags on the landing side for clearing the gap.
        for (let k = 0; k < 3; k++) {
          const x = x1 - 130 + k * 46;
          if (!this.terrain.isGap(x)) this.pickups.push(new Pickup(this, x, this.terrain.heightAt(x), 'cash'));
        }
        continue;
      }
      if (b.leadRamp) this.placeRamp(x0 + 50);

      const zCount = Math.round((lenM / 100) * b.zPer100 * (0.5 + seg.intensity * 0.8));
      for (let k = 0; k < zCount; k++) {
        const x = Phaser.Math.Between(x0 + 40, x1 - 40);
        if (this.terrain.isGap(x)) continue;
        this.zombies.push(new Zombie(this, x, this.terrain.heightAt(x), this.weighted(b.zMix)));
      }
      const oCount = Math.round((lenM / 100) * b.obstPer100 * (0.5 + seg.intensity * 0.6));
      for (let k = 0; k < oCount; k++) {
        const x = Phaser.Math.Between(x0 + 40, x1 - 40);
        if (this.terrain.isGap(x)) continue;
        this.obstacles.push(new Obstacle(this, x, this.terrain.heightAt(x), this.weighted(b.obstMix)));
      }
      const fuelCount = Math.round((lenM / 100) * b.fuelPer100);
      for (let k = 0; k < fuelCount; k++) {
        const x = x0 + ((k + 0.5) / Math.max(1, fuelCount)) * (x1 - x0);
        if (this.terrain.isGap(x)) continue;
        this.pickups.push(new Pickup(this, x, this.terrain.heightAt(x), 'fuel'));
      }
      const cashCount = Math.round((lenM / 100) * b.cashPer100);
      for (let k = 0; k < cashCount; k++) {
        const x = x0 + ((k + 0.5) / Math.max(1, cashCount)) * (x1 - x0);
        if (this.terrain.isGap(x)) continue;
        this.pickups.push(new Pickup(this, x, this.terrain.heightAt(x), 'cash'));
      }
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
    const maxSpeedApprox = 7 + Save.stats().engine * 3.6;
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
      targetM: this.effectiveDistanceM,
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
    const gross = this.bagCash + distanceCash;
    // Evac banks 100%; dying only banks 60% — surviving is meaningfully richer.
    const cashCollected = reachedEvac ? gross : Math.round(gross * 0.6);

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
