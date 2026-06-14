/**
 * Sfx.ts — Synthesized Web Audio sound system for "Earn to Die — Evac Run".
 *
 * ALL sound is generated procedurally via the Web Audio API (oscillators,
 * gains, and noise buffers). There are NO audio asset files. The module is a
 * single exported singleton (`Sfx`).
 *
 * Defensive by design: every public method is wrapped so it can never throw —
 * if the AudioContext is unavailable, not yet created, or suspended, calls are
 * silently no-ops. This lets game code call sounds freely (even before the
 * first user gesture) without guarding each call site.
 */

// Browser AudioContext ctor, with the webkit-prefixed fallback for old Safari.
type AudioCtxCtor = typeof AudioContext;
function getAudioCtxCtor(): AudioCtxCtor | null {
  const w = window as unknown as {
    AudioContext?: AudioCtxCtor;
    webkitAudioContext?: AudioCtxCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Master output level when un-muted (kept well below 1.0 to avoid clipping). */
const MASTER_VOLUME = 0.5;

class SfxImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  // Persistent engine-drone nodes (created on startEngine, torn down on stop).
  private engineOscA: OscillatorNode | null = null;
  private engineOscB: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private engineRunning = false;

  private _muted = false;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Lazily create the shared AudioContext + master GainNode. Safe to re-call. */
  init(): void {
    try {
      if (this.ctx) return;
      const Ctor = getAudioCtxCtor();
      if (!Ctor) return; // No Web Audio support — stay silent.
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : MASTER_VOLUME;
      this.master.connect(this.ctx.destination);
    } catch {
      // Never let audio setup break the game.
      this.ctx = null;
      this.master = null;
    }
  }

  /**
   * Resume the AudioContext. Browsers start contexts "suspended" until a user
   * gesture; call this on the first key/click. Creates the context on demand.
   */
  resume(): void {
    try {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        // resume() returns a promise; we don't await it (and swallow rejection).
        void this.ctx.resume().catch(() => undefined);
      }
    } catch {
      /* no-op */
    }
  }

  // ---------------------------------------------------------------------------
  // Mute control
  // ---------------------------------------------------------------------------

  get muted(): boolean {
    return this._muted;
  }

  /** Ramp master gain to 0 (muted) or normal volume (un-muted), click-free. */
  setMuted(m: boolean): void {
    this._muted = m;
    try {
      if (!this.master || !this.ctx) return;
      const target = m ? 0 : MASTER_VOLUME;
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(target, now, 0.03);
    } catch {
      /* no-op */
    }
  }

  /** Flip mute state and return the new value. */
  toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** Ensure a usable context + master; returns them or null if unavailable. */
  private ready(): { ctx: AudioContext; master: GainNode } | null {
    if (!this.ctx || !this.master) {
      this.init();
    }
    if (!this.ctx || !this.master) return null;
    return { ctx: this.ctx, master: this.master };
  }

  /**
   * Build a short white-noise AudioBuffer (mono). Reused by percussive sounds.
   * @param ctx     audio context
   * @param seconds buffer length
   */
  private makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  /**
   * Schedule a standard percussive gain envelope (fast attack, exp-ish decay)
   * and auto-disconnect the node after it finishes so nothing leaks.
   * @returns the configured GainNode (caller connects sources -> this -> master)
   */
  private envelope(
    ctx: AudioContext,
    master: GainNode,
    peak: number,
    attack: number,
    release: number,
    startAt: number,
  ): GainNode {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, startAt);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), startAt + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + attack + release);
    g.connect(master);
    // Cleanup slightly after the envelope completes.
    const stopAt = startAt + attack + release;
    window.setTimeout(() => {
      try {
        g.disconnect();
      } catch {
        /* no-op */
      }
    }, (stopAt - ctx.currentTime) * 1000 + 60);
    return g;
  }

  /** Play a single oscillator note through an envelope. */
  private tone(
    ctx: AudioContext,
    master: GainNode,
    type: OscillatorType,
    freq: number,
    peak: number,
    attack: number,
    release: number,
    startAt: number,
    endFreq?: number,
  ): void {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, endFreq),
        startAt + attack + release,
      );
    }
    const g = this.envelope(ctx, master, peak, attack, release, startAt);
    osc.connect(g);
    osc.start(startAt);
    osc.stop(startAt + attack + release + 0.05);
    osc.onended = () => {
      try {
        osc.disconnect();
      } catch {
        /* no-op */
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Continuous engine drone
  // ---------------------------------------------------------------------------

  /** Start the looping engine drone (idempotent). */
  startEngine(): void {
    try {
      const r = this.ready();
      if (!r) return;
      if (this.engineRunning) return;
      const { ctx, master } = r;
      const now = ctx.currentTime;

      // Two slightly detuned saw oscillators -> lowpass -> dedicated gain.
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      oscA.type = 'sawtooth';
      oscB.type = 'sawtooth';
      oscA.frequency.setValueAtTime(60, now);
      oscB.frequency.setValueAtTime(64, now); // detune for a fatter drone

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.Q.value = 6;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.setTargetAtTime(0.06, now, 0.1); // gentle fade-in to idle level

      oscA.connect(filter);
      oscB.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      oscA.start(now);
      oscB.start(now);

      this.engineOscA = oscA;
      this.engineOscB = oscB;
      this.engineFilter = filter;
      this.engineGain = gain;
      this.engineRunning = true;
    } catch {
      /* no-op */
    }
  }

  /** Stop and tear down the engine drone (idempotent). */
  stopEngine(): void {
    try {
      if (!this.engineRunning || !this.ctx) {
        this.engineRunning = false;
        return;
      }
      const now = this.ctx.currentTime;
      // Fade gain out, then stop oscillators shortly after to avoid clicks.
      if (this.engineGain) {
        this.engineGain.gain.cancelScheduledValues(now);
        this.engineGain.gain.setTargetAtTime(0.0001, now, 0.05);
      }
      const oscA = this.engineOscA;
      const oscB = this.engineOscB;
      const filter = this.engineFilter;
      const gain = this.engineGain;
      window.setTimeout(() => {
        try {
          oscA?.stop();
          oscB?.stop();
          oscA?.disconnect();
          oscB?.disconnect();
          filter?.disconnect();
          gain?.disconnect();
        } catch {
          /* no-op */
        }
      }, 250);
      this.engineOscA = null;
      this.engineOscB = null;
      this.engineFilter = null;
      this.engineGain = null;
      this.engineRunning = false;
    } catch {
      /* no-op */
    }
  }

  /**
   * Update the engine drone in real time.
   * @param throttle whether the player is accelerating (louder, brighter)
   * @param speed01  current speed normalized 0..1 (raises pitch & filter)
   */
  setEngine(throttle: boolean, speed01: number): void {
    try {
      if (!this.engineRunning || !this.ctx) return;
      const s = Math.min(1, Math.max(0, speed01));
      const now = this.ctx.currentTime;

      // Base ~55Hz idle rising toward ~165Hz at full speed; B detuned higher.
      const baseFreq = 55 + s * 110;
      this.engineOscA?.frequency.setTargetAtTime(baseFreq, now, 0.08);
      this.engineOscB?.frequency.setTargetAtTime(baseFreq * 1.06, now, 0.08);

      // Open the lowpass with speed for a brighter tone under load.
      const cutoff = 350 + s * 1800 + (throttle ? 400 : 0);
      this.engineFilter?.frequency.setTargetAtTime(cutoff, now, 0.08);

      // Louder under throttle, quiet idle; also a touch louder at speed.
      const level = (throttle ? 0.14 : 0.05) + s * 0.06;
      this.engineGain?.gain.setTargetAtTime(level, now, 0.1);
    } catch {
      /* no-op */
    }
  }

  // ---------------------------------------------------------------------------
  // One-shot sound effects (all safe to spam)
  // ---------------------------------------------------------------------------

  /** Dull thud — low triangle blip with a quick downward bend. */
  hit(): void {
    try {
      const r = this.ready();
      if (!r) return;
      const { ctx, master } = r;
      const t = ctx.currentTime;
      this.tone(ctx, master, 'triangle', 140, 0.5, 0.005, 0.16, t, 70);
    } catch {
      /* no-op */
    }
  }

  /** Wet zombie squish — noise burst through a dropping lowpass. */
  splat(): void {
    try {
      const r = this.ready();
      if (!r) return;
      const { ctx, master } = r;
      const t = ctx.currentTime;

      const src = ctx.createBufferSource();
      src.buffer = this.makeNoise(ctx, 0.22);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1800, t);
      lp.frequency.exponentialRampToValueAtTime(180, t + 0.2); // wet pitch drop
      lp.Q.value = 4;

      const g = this.envelope(ctx, master, 0.5, 0.005, 0.2, t);
      src.connect(lp);
      lp.connect(g);
      src.start(t);
      src.stop(t + 0.25);
      src.onended = () => {
        try {
          src.disconnect();
          lp.disconnect();
        } catch {
          /* no-op */
        }
      };
    } catch {
      /* no-op */
    }
  }

  /** Bright pickup — two-note arpeggio (~880 -> 1320Hz). */
  coin(): void {
    try {
      const r = this.ready();
      if (!r) return;
      const { ctx, master } = r;
      const t = ctx.currentTime;
      this.tone(ctx, master, 'square', 880, 0.28, 0.005, 0.09, t);
      this.tone(ctx, master, 'triangle', 1320, 0.3, 0.005, 0.12, t + 0.08);
    } catch {
      /* no-op */
    }
  }

  /** Refill "glug" — rising tone with a little wobble. */
  fuel(): void {
    try {
      const r = this.ready();
      if (!r) return;
      const { ctx, master } = r;
      const t = ctx.currentTime;
      // Rising sine sweep.
      this.tone(ctx, master, 'sine', 220, 0.35, 0.02, 0.28, t, 520);
      // Higher overtone for a "topping off" shimmer.
      this.tone(ctx, master, 'triangle', 440, 0.15, 0.02, 0.24, t + 0.04, 880);
    } catch {
      /* no-op */
    }
  }

  /** Gun crack — very short noise burst plus a click transient. */
  shoot(): void {
    try {
      const r = this.ready();
      if (!r) return;
      const { ctx, master } = r;
      const t = ctx.currentTime;

      const src = ctx.createBufferSource();
      src.buffer = this.makeNoise(ctx, 0.08);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(800, t);
      const g = this.envelope(ctx, master, 0.45, 0.001, 0.06, t);
      src.connect(hp);
      hp.connect(g);
      src.start(t);
      src.stop(t + 0.1);
      src.onended = () => {
        try {
          src.disconnect();
          hp.disconnect();
        } catch {
          /* no-op */
        }
      };

      // Tonal click transient for "snap".
      this.tone(ctx, master, 'square', 320, 0.25, 0.001, 0.03, t, 120);
    } catch {
      /* no-op */
    }
  }

  /** Whoosh — noise through a bandpass that sweeps up then back down. */
  boost(): void {
    try {
      const r = this.ready();
      if (!r) return;
      const { ctx, master } = r;
      const t = ctx.currentTime;
      const dur = 0.5;

      const src = ctx.createBufferSource();
      src.buffer = this.makeNoise(ctx, dur);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 3;
      bp.frequency.setValueAtTime(300, t);
      bp.frequency.linearRampToValueAtTime(2600, t + dur * 0.5); // rise
      bp.frequency.linearRampToValueAtTime(500, t + dur); // fall

      const g = this.envelope(ctx, master, 0.4, 0.08, dur - 0.08, t);
      src.connect(bp);
      bp.connect(g);
      src.start(t);
      src.stop(t + dur + 0.05);
      src.onended = () => {
        try {
          src.disconnect();
          bp.disconnect();
        } catch {
          /* no-op */
        }
      };
    } catch {
      /* no-op */
    }
  }

  /**
   * Suspension thump on landing.
   * @param intensity01 0..1 — louder & lower with bigger impacts.
   */
  land(intensity01: number): void {
    try {
      const r = this.ready();
      if (!r) return;
      const { ctx, master } = r;
      const t = ctx.currentTime;
      const i = Math.min(1, Math.max(0, intensity01));
      const peak = 0.3 + i * 0.4;
      const freq = 120 - i * 50; // heavier impact = lower thud
      this.tone(ctx, master, 'sine', freq, peak, 0.004, 0.14 + i * 0.08, t, freq * 0.5);

      // Add a little noisy "crunch" scaled with intensity.
      if (i > 0.05) {
        const src = ctx.createBufferSource();
        src.buffer = this.makeNoise(ctx, 0.1);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 600;
        const g = this.envelope(ctx, master, 0.2 * i, 0.002, 0.08, t);
        src.connect(lp);
        lp.connect(g);
        src.start(t);
        src.stop(t + 0.12);
        src.onended = () => {
          try {
            src.disconnect();
            lp.disconnect();
          } catch {
            /* no-op */
          }
        };
      }
    } catch {
      /* no-op */
    }
  }

  /** Triumphant rising chime — reward for landing a flip/stunt. */
  stunt(): void {
    try {
      const r = this.ready();
      if (!r) return;
      const { ctx, master } = r;
      const t = ctx.currentTime;
      const notes = [659, 880, 1175]; // E5, A5, D6 — bright rising
      notes.forEach((f, idx) => {
        this.tone(ctx, master, 'triangle', f, 0.26, 0.005, 0.16, t + idx * 0.07);
      });
    } catch {
      /* no-op */
    }
  }

  /** Soft UI click/blip. */
  ui(): void {
    try {
      const r = this.ready();
      if (!r) return;
      const { ctx, master } = r;
      const t = ctx.currentTime;
      this.tone(ctx, master, 'square', 660, 0.18, 0.002, 0.05, t, 880);
    } catch {
      /* no-op */
    }
  }

  /** Short ascending victory jingle. */
  win(): void {
    try {
      const r = this.ready();
      if (!r) return;
      const { ctx, master } = r;
      const t = ctx.currentTime;
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      notes.forEach((f, idx) => {
        this.tone(ctx, master, 'triangle', f, 0.3, 0.006, 0.2, t + idx * 0.12);
      });
    } catch {
      /* no-op */
    }
  }

  /** Short descending "fail" motif. */
  lose(): void {
    try {
      const r = this.ready();
      if (!r) return;
      const { ctx, master } = r;
      const t = ctx.currentTime;
      const notes = [440, 349, 262]; // A4 F4 C4 — sad descent
      notes.forEach((f, idx) => {
        this.tone(ctx, master, 'sawtooth', f, 0.26, 0.008, 0.24, t + idx * 0.16, f * 0.97);
      });
    } catch {
      /* no-op */
    }
  }
}

/** Singleton instance — import and use directly. */
export const Sfx = new SfxImpl();
