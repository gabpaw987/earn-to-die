import Phaser from 'phaser';

/** Texture key for the shared 8x8 white circle particle. */
const PARTICLE_KEY = 'tex-particle';

/**
 * Fx — a stateless visual-juice helper for a Phaser scene.
 *
 * Provides camera shake/flash, one-shot particle bursts (dust, exhaust,
 * sparks, blood), and floating popup / combo text. Every emitter is
 * self-destroying so this can be called constantly during play with no leaks.
 */
export class Fx {
  constructor(private scene: Phaser.Scene) {
    // Ensure the shared particle texture exists. The main game may also create
    // it; guard so we never double-create.
    if (!scene.textures.exists(PARTICLE_KEY)) {
      const g = scene.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4); // 8x8 white circle
      g.generateTexture(PARTICLE_KEY, 8, 8);
      g.destroy();
    }
  }

  /** Camera shake. */
  shake(durationMs: number, intensity: number): void {
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  /** Camera flash, colour derived from a 0xRRGGBB int. */
  flash(color: number, durationMs: number): void {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    this.scene.cameras.main.flash(durationMs, r, g, b);
  }

  /**
   * Tyre-dust puff. `dir` (-1/1) biases horizontal velocity so dust trails
   * behind the wheel's travel direction.
   */
  dust(x: number, y: number, dir: number): void {
    const lifespan = 420;
    const e = this.scene.add.particles(x, y, PARTICLE_KEY, {
      lifespan,
      // Bias spray opposite-ish to travel; dir flips the cone.
      speedX: { min: 20 * dir, max: 90 * dir },
      speedY: { min: -70, max: -10 },
      angle: { min: 0, max: 360 },
      gravityY: 120,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.55, end: 0 },
      tint: [0x9a8c79, 0x7a6f60, 0xb3a591], // brown / grey dust
      emitting: false,
    });
    e.explode(6, x, y);
    this.scene.time.delayedCall(lifespan + 60, () => e.destroy());
  }

  /**
   * Dark exhaust smoke emitted behind the car while throttling. Intended to be
   * called every frame — kept cheap (1-2 particles per call).
   */
  exhaust(x: number, y: number, angleRad: number): void {
    const lifespan = 500;
    const deg = Phaser.Math.RadToDeg(angleRad);
    const e = this.scene.add.particles(x, y, PARTICLE_KEY, {
      lifespan,
      speed: { min: 15, max: 45 },
      angle: { min: deg - 12, max: deg + 12 },
      scale: { start: 0.35, end: 0.9 }, // smoke expands as it dissipates
      alpha: { start: 0.45, end: 0 },
      tint: [0x3a3a3a, 0x555555],
      emitting: false,
    });
    e.explode(Phaser.Math.Between(1, 2), x, y);
    this.scene.time.delayedCall(lifespan + 50, () => e.destroy());
  }

  /** Bright metal-impact sparks. */
  sparks(x: number, y: number): void {
    const lifespan = 320;
    const e = this.scene.add.particles(x, y, PARTICLE_KEY, {
      lifespan: { min: 140, max: lifespan },
      speed: { min: 120, max: 320 },
      angle: { min: 0, max: 360 },
      gravityY: 380,
      scale: { start: 0.5, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      tint: [0xffffff, 0xffe066, 0xffaa22], // white / yellow / amber
      emitting: false,
    });
    e.explode(10, x, y);
    this.scene.time.delayedCall(lifespan + 60, () => e.destroy());
  }

  /**
   * Dark-red blood burst for a zombie kill. ~8 particles fly up/outward then
   * fall under gravity. `dir` (-1/1) biases the spray sideways.
   */
  blood(x: number, y: number, dir: number): void {
    const lifespan = 520;
    const e = this.scene.add.particles(x, y, PARTICLE_KEY, {
      lifespan,
      speedX: { min: 30 * dir, max: 180 * dir },
      speedY: { min: -220, max: -40 },
      gravityY: 600,
      scale: { start: 0.85, end: 0.1 },
      alpha: { start: 1, end: 0.3 },
      tint: [0x8b0000, 0x6e0000, 0xa50f0f], // dark red
      emitting: false,
    });
    e.explode(8, x, y);
    this.scene.time.delayedCall(lifespan + 80, () => e.destroy());
  }

  /**
   * Floating text that rises ~40px and fades over ~800ms, e.g. "+$12" or
   * "BACKFLIP!". Self-destructs when the tween completes.
   */
  popup(x: number, y: number, text: string, color: string = '#ffe08a'): void {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.scene.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  /**
   * Combo popup — bigger and punchier than {@link popup}. Renders `xN`, scales
   * in, then drifts up and fades. Colour shifts hotter as `n` grows
   * (yellow -> orange -> red).
   */
  combo(x: number, y: number, n: number): void {
    const color = n >= 8 ? '#ff3b30' : n >= 4 ? '#ff8c00' : '#ffd23b';
    const t = this.scene.add
      .text(x, y, `x${n}`, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setScale(0.2);

    // Punchy scale-in, then a brief hold before the rise/fade.
    this.scene.tweens.add({
      targets: t,
      scale: 1.15,
      duration: 160,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: t,
          y: y - 50,
          alpha: 0,
          scale: 1.3,
          duration: 640,
          ease: 'Cubic.easeOut',
          onComplete: () => t.destroy(),
        });
      },
    });
  }
}
