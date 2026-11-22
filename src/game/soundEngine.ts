type AudioContextCtor = typeof AudioContext;

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterVolumeNorm = 0.75;
  private ambientGain: GainNode | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientLfo: OscillatorNode | null = null;
  private ambientStarted = false;
  private disposed = false;

  private flightGain: GainNode | null = null;
  private flightOscA: OscillatorNode | null = null;
  private flightOscB: OscillatorNode | null = null;
  private flightLfo: OscillatorNode | null = null;
  private flightActive = false;

  private painGain: GainNode | null = null;
  private painOscA: OscillatorNode | null = null;
  private painOscB: OscillatorNode | null = null;
  private painLfo: OscillatorNode | null = null;
  private painActive = false;
  private whiteNoiseBuffer: AudioBuffer | null = null;

  public setMasterVolume(percent0to100: number): void {
    const norm = Math.min(1, Math.max(0, percent0to100 / 100));
    this.masterVolumeNorm = norm;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(norm * 0.85, now, 0.025);
    }
  }

  public unlock(): void {
    if (this.disposed) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {
        // Browser may still require another direct gesture
      });
    }

    if (!this.ambientStarted) {
      this.startAmbientWind(ctx);
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.disposed) return null;
    if (this.ctx) return this.ctx;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = this.masterVolumeNorm * 0.85;
      master.connect(ctx.destination);

      this.ctx = ctx;
      this.masterGain = master;
      return ctx;
    } catch {
      return null;
    }
  }

  private startAmbientWind(ctx: AudioContext): void {
    if (!this.masterGain || this.ambientStarted) return;
    this.ambientStarted = true;

    const durationSec = 4;
    const sampleCount = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    for (let i = 0; i < sampleCount; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      b3 = 0.85 * b3 + white * 0.07;
      data[i] = (b0 + b1 + b2 + b3) * 0.25;
    }

    const fadeLen = Math.min(2048, Math.floor(sampleCount / 8));
    for (let i = 0; i < fadeLen; i++) {
      const t = i / fadeLen;
      const tailIdx = sampleCount - fadeLen + i;
      const mixed = data[i] * t + data[tailIdx] * (1 - t);
      data[i] = mixed;
      data[tailIdx] = mixed;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 340;
    lowpass.Q.value = 0.7;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 95;
    highpass.Q.value = 0.5;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.026, now + 1.8);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.09;

    const lfoFilterGain = ctx.createGain();
    lfoFilterGain.gain.value = 110;
    lfo.connect(lfoFilterGain);
    lfoFilterGain.connect(lowpass.frequency);

    src.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.masterGain);

    src.start(now);
    lfo.start(now);

    this.ambientSource = src;
    this.ambientLfo = lfo;
    this.ambientGain = gain;
  }

  private getWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.whiteNoiseBuffer && this.whiteNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.whiteNoiseBuffer;
    }
    const durationSec = 2.5;
    const count = Math.floor(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(1, count, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < count; i++) {
      ch[i] = Math.random() * 2 - 1;
    }
    this.whiteNoiseBuffer = buf;
    return buf;
  }

  private playFilteredWhoosh(
    ctx: AudioContext,
    durationSec: number,
    startFreq: number,
    endFreq: number,
    peakGain: number,
    q = 2.4,
  ): void {
    if (!this.masterGain) return;
    const buf = this.getWhiteNoiseBuffer(ctx);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = q;

    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + durationSec);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + durationSec * 0.22);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    const offset = Math.random() * Math.max(0.1, buf.duration - 0.1);
    src.start(now, offset, durationSec + 0.02);
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.105);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.068, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playAbilityActivate(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(410, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.055);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.052, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playAbilityToggle(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    if (active) {
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);
      this.playFilteredWhoosh(ctx, 0.22, 420, 1450, 0.04, 1.8);
    } else {
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(270, now + 0.12);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(active ? 0.06 : 0.048, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playSprintToggle(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (active) {
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.065);
    } else {
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.065);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(active ? 0.052 : 0.045, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playSelect(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const notes = [440, 587.3, 740];
    notes.forEach((freq, i) => {
      const start = now + i * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.056, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  }

  public playDeath(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.exponentialRampToValueAtTime(105, now + 0.25);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.072, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playRespawn(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.16);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.062, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playRevival(isPhoenix: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // 1. Rising charge swell (0..0.38s)
    this.playFilteredWhoosh(ctx, 0.38, 280, 1750, 0.056, 2.0);
    const rise = ctx.createOscillator();
    const riseGain = ctx.createGain();
    rise.type = 'sine';
    rise.frequency.setValueAtTime(isPhoenix ? 261.63 : 220, now);
    rise.frequency.exponentialRampToValueAtTime(isPhoenix ? 587.33 : 493.88, now + 0.36);

    riseGain.gain.setValueAtTime(0.0001, now);
    riseGain.gain.linearRampToValueAtTime(0.056, now + 0.08);
    riseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.39);
    rise.connect(riseGain);
    riseGain.connect(this.masterGain);
    rise.start(now);
    rise.stop(now + 0.41);

    // 2. Synchronized rebirth eruption at +0.36s
    const burstAt = now + 0.36;
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(195, burstAt);
    sub.frequency.exponentialRampToValueAtTime(52, burstAt + 0.38);

    subGain.gain.setValueAtTime(0.0001, burstAt);
    subGain.gain.linearRampToValueAtTime(0.095, burstAt + 0.018);
    subGain.gain.exponentialRampToValueAtTime(0.0001, burstAt + 0.42);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(burstAt);
    sub.stop(burstAt + 0.44);

    const chord = isPhoenix ? [523.25, 783.99, 1046.5] : [392, 587.33, 783.99];
    for (let i = 0; i < chord.length; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(chord[i], burstAt);
      g.gain.setValueAtTime(0.0001, burstAt);
      g.gain.linearRampToValueAtTime(0.038 - i * 0.007, burstAt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, burstAt + 0.48);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(burstAt);
      osc.stop(burstAt + 0.5);
    }
  }

  public setFlightAmbience(active: boolean): void {
    if (this.disposed || this.flightActive === active) return;
    this.flightActive = active;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    if (active && ctx.state === 'running') {
      if (!this.flightGain) {
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(480, now);
        filter.Q.value = 2.2;

        const oscA = ctx.createOscillator();
        oscA.type = 'sine';
        oscA.frequency.setValueAtTime(164.8, now);

        const oscB = ctx.createOscillator();
        oscB.type = 'triangle';
        oscB.frequency.setValueAtTime(247.2, now);

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(2.6, now);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(90, now);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        oscA.connect(filter);
        oscB.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        oscA.start(now);
        oscB.start(now);
        lfo.start(now);

        this.flightGain = gain;
        this.flightOscA = oscA;
        this.flightOscB = oscB;
        this.flightLfo = lfo;
      }

      this.flightGain.gain.cancelScheduledValues(now);
      this.flightGain.gain.setValueAtTime(
        Math.max(0.0001, this.flightGain.gain.value),
        now,
      );
      this.flightGain.gain.linearRampToValueAtTime(0.024, now + 0.32);
    } else if (this.flightGain) {
      this.flightGain.gain.cancelScheduledValues(now);
      this.flightGain.gain.setValueAtTime(
        Math.max(0.0001, this.flightGain.gain.value),
        now,
      );
      this.flightGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    }
  }

  public playChaosBolt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Arcane conjuration sparkle + crisp crimson projectile launch whoosh
    this.playFilteredWhoosh(ctx, 0.16, 1900, 520, 0.048, 2.2);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.14);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);

    const chime = ctx.createOscillator();
    const cGain = ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(980, now);
    chime.frequency.exponentialRampToValueAtTime(520, now + 0.085);

    cGain.gain.setValueAtTime(0.0001, now);
    cGain.gain.linearRampToValueAtTime(0.025, now + 0.008);
    cGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

    chime.connect(cGain);
    cGain.connect(this.masterGain);
    chime.start(now);
    chime.stop(now + 0.105);
  }

  public playTeleportStart(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Mist dissolve air sweep + rising ethereal vanish tone
    this.playFilteredWhoosh(ctx, 0.42, 420, 2200, 0.045, 2.0);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.42);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.048, now + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.47);
  }

  public playTeleportArrive(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.2, 1600, 380, 0.045, 1.9);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.19);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.052, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playChaosImplosionCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Magical charging swell + release resonance
    this.playFilteredWhoosh(ctx, 0.22, 320, 1280, 0.052, 2.5);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.18);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.058, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playChaosImplosionAbsorb(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Supernatural spherical pulse: sub-bass gravity surge + shimmering expansion sweep
    this.playFilteredWhoosh(ctx, 0.36, 950, 260, 0.068, 1.8);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(190, now);
    sub.frequency.exponentialRampToValueAtTime(58, now + 0.34);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.088, now + 0.025);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.4);

    const over = ctx.createOscillator();
    const overGain = ctx.createGain();
    over.type = 'triangle';
    over.frequency.setValueAtTime(420, now);
    over.frequency.exponentialRampToValueAtTime(210, now + 0.24);

    overGain.gain.setValueAtTime(0.0001, now);
    overGain.gain.linearRampToValueAtTime(0.036, now + 0.02);
    overGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    over.connect(overGain);
    overGain.connect(this.masterGain);
    over.start(now);
    over.stop(now + 0.3);
  }

  public playMagicHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Subtle, satisfying hit-confirmation tick + arcane resonance (never harsh)
    const tick = ctx.createOscillator();
    const tickGain = ctx.createGain();
    tick.type = 'sine';
    tick.frequency.setValueAtTime(840, now);
    tick.frequency.exponentialRampToValueAtTime(420, now + 0.06);

    tickGain.gain.setValueAtTime(0.0001, now);
    tickGain.gain.linearRampToValueAtTime(0.055, now + 0.005);
    tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

    tick.connect(tickGain);
    tickGain.connect(this.masterGain);
    tick.start(now);
    tick.stop(now + 0.085);

    const punch = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punch.type = 'triangle';
    punch.frequency.setValueAtTime(195, now);
    punch.frequency.exponentialRampToValueAtTime(98, now + 0.07);

    punchGain.gain.setValueAtTime(0.0001, now);
    punchGain.gain.linearRampToValueAtTime(0.042, now + 0.006);
    punchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

    punch.connect(punchGain);
    punchGain.connect(this.masterGain);
    punch.start(now);
    punch.stop(now + 0.095);
  }

  public playPhoenixWaveCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.28, 380, 1680, 0.052, 2.1);

    const freqs = [392, 587.33];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.48, now + 0.22);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(idx === 0 ? 0.044 : 0.024, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.28);
    });
  }

  public playPhoenixWaveExplosion(stepIdx = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    const pitchScale = stepIdx === 2 ? 0.88 : 1 + stepIdx * 0.07;
    this.playFilteredWhoosh(ctx, 0.38, 760 * pitchScale, 175, 0.082, 1.5);
    this.playFilteredWhoosh(ctx, 0.24, 1850 * pitchScale, 720, 0.036, 2.8);

    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'triangle';
    boom.frequency.setValueAtTime(178 * pitchScale, now);
    boom.frequency.exponentialRampToValueAtTime(54, now + 0.3);

    boomGain.gain.setValueAtTime(0.0001, now);
    boomGain.gain.linearRampToValueAtTime(0.088, now + 0.015);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.33);

    boom.connect(boomGain);
    boomGain.connect(this.masterGain);
    boom.start(now);
    boom.stop(now + 0.35);

    // Radiant Phoenix harmonic flare
    const cry = ctx.createOscillator();
    const cryGain = ctx.createGain();
    cry.type = 'sine';
    cry.frequency.setValueAtTime(620 * pitchScale, now);
    cry.frequency.exponentialRampToValueAtTime(980 * pitchScale, now + 0.09);
    cry.frequency.exponentialRampToValueAtTime(480 * pitchScale, now + 0.28);

    cryGain.gain.setValueAtTime(0.0001, now);
    cryGain.gain.linearRampToValueAtTime(0.034, now + 0.025);
    cryGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    cry.connect(cryGain);
    cryGain.connect(this.masterGain);
    cry.start(now);
    cry.stop(now + 0.32);
  }

  public playPhoenixFireballCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.16, 1650, 520, 0.052, 2.0);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.13);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.052, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);

    const spark = ctx.createOscillator();
    const sGain = ctx.createGain();
    spark.type = 'triangle';
    spark.frequency.setValueAtTime(1180, now);
    spark.frequency.exponentialRampToValueAtTime(640, now + 0.07);
    sGain.gain.setValueAtTime(0.0001, now);
    sGain.gain.linearRampToValueAtTime(0.024, now + 0.006);
    sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
    spark.connect(sGain);
    sGain.connect(this.masterGain);
    spark.start(now);
    spark.stop(now + 0.095);
  }

  public playPhoenixFireballImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.18, 1250, 320, 0.048, 2.2);

    const pop = ctx.createOscillator();
    const popGain = ctx.createGain();
    pop.type = 'triangle';
    pop.frequency.setValueAtTime(240, now);
    pop.frequency.exponentialRampToValueAtTime(84, now + 0.13);

    popGain.gain.setValueAtTime(0.0001, now);
    popGain.gain.linearRampToValueAtTime(0.058, now + 0.008);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    pop.connect(popGain);
    popGain.connect(this.masterGain);
    pop.start(now);
    pop.stop(now + 0.16);
  }

  public playBurnTick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(ctx, 0.1, 2500, 920, 0.03, 3.1);
  }

  public setPainChannelAmbience(active: boolean): void {
    if (this.disposed || this.painActive === active) return;
    this.painActive = active;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    if (active && ctx.state === 'running') {
      if (!this.painGain) {
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(520, now);
        bandpass.Q.value = 1.6;

        const oscA = ctx.createOscillator();
        oscA.type = 'sine';
        oscA.frequency.setValueAtTime(220, now);

        const oscB = ctx.createOscillator();
        oscB.type = 'sine';
        oscB.frequency.setValueAtTime(330, now);

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(4.2, now);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(140, now);
        lfo.connect(lfoGain);
        lfoGain.connect(bandpass.frequency);

        oscA.connect(bandpass);
        oscB.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.masterGain);

        oscA.start(now);
        oscB.start(now);
        lfo.start(now);

        this.painGain = gain;
        this.painOscA = oscA;
        this.painOscB = oscB;
        this.painLfo = lfo;
      }

      this.painGain.gain.cancelScheduledValues(now);
      this.painGain.gain.setValueAtTime(
        Math.max(0.0001, this.painGain.gain.value),
        now,
      );
      this.painGain.gain.linearRampToValueAtTime(0.026, now + 0.22);
    } else if (this.painGain) {
      this.painGain.gain.cancelScheduledValues(now);
      this.painGain.gain.setValueAtTime(
        Math.max(0.0001, this.painGain.gain.value),
        now,
      );
      this.painGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    }
  }

  public playPainInflictionStart(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.28, 360, 1480, 0.048, 2.4);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.24);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.052, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.27);
  }

  public playPainInflictionTick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playPainInflictionExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Telekinetic wave air-distortion sweep + deep radial shockwave
    this.playFilteredWhoosh(ctx, 0.48, 1280, 160, 0.088, 1.4);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(210, now);
    sub.frequency.exponentialRampToValueAtTime(46, now + 0.38);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.095, now + 0.016);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.42);

    const shimmer = ctx.createOscillator();
    const shGain = ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(880, now);
    shimmer.frequency.exponentialRampToValueAtTime(340, now + 0.28);
    shGain.gain.setValueAtTime(0.0001, now);
    shGain.gain.linearRampToValueAtTime(0.036, now + 0.015);
    shGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    shimmer.connect(shGain);
    shGain.connect(this.masterGain);
    shimmer.start(now);
    shimmer.stop(now + 0.32);
  }

  public playPhoenixFlightSpin(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    if (active) {
      this.playFilteredWhoosh(ctx, 0.34, 360, 1850, 0.06, 1.8);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.25);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.056, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.29);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.31);
    } else {
      this.playAbilityToggle(false);
    }
  }

  public playWingsToggle(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    this.playFilteredWhoosh(
      ctx,
      0.22,
      active ? 420 : 1020,
      active ? 1420 : 360,
      0.048,
      1.8,
    );
  }

  public playScarletFlightCancelShockwave(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Crimson chaos burst shockwave + downward snap resonance
    this.playFilteredWhoosh(ctx, 0.42, 1380, 180, 0.085, 1.6);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(220, now);
    sub.frequency.exponentialRampToValueAtTime(52, now + 0.34);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.092, now + 0.014);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.37);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.39);

    const hex = ctx.createOscillator();
    const hGain = ctx.createGain();
    hex.type = 'triangle';
    hex.frequency.setValueAtTime(640, now);
    hex.frequency.exponentialRampToValueAtTime(195, now + 0.22);

    hGain.gain.setValueAtTime(0.0001, now);
    hGain.gain.linearRampToValueAtTime(0.045, now + 0.01);
    hGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    hex.connect(hGain);
    hGain.connect(this.masterGain);
    hex.start(now);
    hex.stop(now + 0.25);
  }

  public playDarkholdOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Deep eldritch summon resonance + mystic page-unfurl sweep
    this.playFilteredWhoosh(ctx, 0.34, 240, 1420, 0.056, 2.2);

    const base = ctx.createOscillator();
    const baseGain = ctx.createGain();
    base.type = 'sine';
    base.frequency.setValueAtTime(146.83, now);
    base.frequency.exponentialRampToValueAtTime(220, now + 0.28);
    baseGain.gain.setValueAtTime(0.0001, now);
    baseGain.gain.linearRampToValueAtTime(0.068, now + 0.04);
    baseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    base.connect(baseGain);
    baseGain.connect(this.masterGain);
    base.start(now);
    base.stop(now + 0.38);

    const chord = [293.66, 349.23, 440];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + 0.04 + i * 0.03);
      g.gain.setValueAtTime(0.0001, now + 0.04 + i * 0.03);
      g.gain.linearRampToValueAtTime(0.028, now + 0.07 + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(now + 0.04 + i * 0.03);
      osc.stop(now + 0.36);
    });
  }

  public playDarkholdClose(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.18, 920, 220, 0.044, 1.8);
    const thud = ctx.createOscillator();
    const g = ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(210, now);
    thud.frequency.exponentialRampToValueAtTime(82, now + 0.15);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.062, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
    thud.connect(g);
    g.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.19);
  }

  public playTelekineticExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.44, 1520, 150, 0.09, 1.5);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(235, now);
    sub.frequency.exponentialRampToValueAtTime(48, now + 0.38);
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.098, now + 0.015);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.44);

    const psi = ctx.createOscillator();
    const pGain = ctx.createGain();
    psi.type = 'triangle';
    psi.frequency.setValueAtTime(760, now);
    psi.frequency.exponentialRampToValueAtTime(210, now + 0.25);
    pGain.gain.setValueAtTime(0.0001, now);
    pGain.gain.linearRampToValueAtTime(0.048, now + 0.012);
    pGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.27);
    psi.connect(pGain);
    pGain.connect(this.masterGain);
    psi.start(now);
    psi.stop(now + 0.29);
  }

  public playAutoShieldActivate(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.24, 380, 1650, 0.045, 2.2);
    const notes = [392, 523.25, 659.25];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.032;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.045, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.26);
    });
  }

  public playAutoShieldDeflect(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    this.playFilteredWhoosh(ctx, 0.18, 1200, 420, 0.052, 2.0);
    const ping = ctx.createOscillator();
    const g = ctx.createGain();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(580, now);
    ping.frequency.exponentialRampToValueAtTime(240, now + 0.14);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    ping.connect(g);
    g.connect(this.masterGain);
    ping.start(now);
    ping.stop(now + 0.18);
  }

  public playCoinCollect(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    const notes = [880, 1174.66];
    notes.forEach((freq, idx) => {
      const t0 = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.052, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.15);
    });
  }

  public playSkinPurchase(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const t0 = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.06, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.19);
    });
  }

  public playPurchaseDenied(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(145, now + 0.14);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playLandDust(intensity = 1.0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const amp = Math.min(1.2, Math.max(0.4, intensity));
    this.playFilteredWhoosh(ctx, 0.13, 320, 95, 0.036 * amp, 1.3);
  }

  public playPhoenixSpecialRise(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.95, 220, 1650, 0.065, 1.9);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(196, now);
    osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.95);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.065, now + 0.14);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.02);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.05);
  }

  public playPhoenixSpecialManifest(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.68, 1600, 180, 0.09, 1.4);

    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(190, now);
    sub.frequency.exponentialRampToValueAtTime(48, now + 0.55);
    sGain.gain.setValueAtTime(0.0001, now);
    sGain.gain.linearRampToValueAtTime(0.1, now + 0.025);
    sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
    sub.connect(sGain);
    sGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.6);

    const chord = [523.25, 783.99, 1046.5, 1318.5];
    chord.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.04 - idx * 0.006, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.88);
    });
  }

  public playMindControlLink(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.28, 520, 1850, 0.044, 2.4);
    const notes = [523.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.035;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.042, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.26);
    });
  }

  public playMindControlSelect(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.24, 1520, 560, 0.046, 2.6);
    const notes = [880, 1174.66];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.03;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.046, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    });
  }

  public playMentalAttack(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.16, 2400, 740, 0.044, 2.8);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.14);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.048, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playMentalImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const chime = ctx.createOscillator();
    const cGain = ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(1240, now);
    chime.frequency.exponentialRampToValueAtTime(420, now + 0.13);
    cGain.gain.setValueAtTime(0.0001, now);
    cGain.gain.linearRampToValueAtTime(0.062, now + 0.008);
    cGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    chime.connect(cGain);
    cGain.connect(this.masterGain);
    chime.start(now);
    chime.stop(now + 0.16);
  }

  public playDiamondForm(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const chord = active ? [987.77, 1318.51, 1760.0] : [1318.51, 987.77];
    chord.forEach((f, idx) => {
      const t0 = now + idx * 0.03;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.045, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
  }

  public playDiamondShard(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.14, 2600, 920, 0.042, 3.0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1480, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.11);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playTelepathicWave(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.45, 480, 1750, 0.05, 2.2);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.32);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.6);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.056, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.64);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.66);
  }

  public playCrownForm(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.34, active ? 220 : 980, active ? 1320 : 240, 0.056, 1.9);
    const notes = active ? [196, 293.66, 392] : [293.66, 196];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.052, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.36);
    });
  }

  public playSwordSummon(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.22, 620, 2400, 0.05, 2.5);
    const ring = ctx.createOscillator();
    const g = ctx.createGain();
    ring.type = 'triangle';
    ring.frequency.setValueAtTime(880, now);
    ring.frequency.exponentialRampToValueAtTime(1320, now + 0.16);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.054, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    ring.connect(g);
    g.connect(this.masterGain);
    ring.start(now);
    ring.stop(now + 0.26);
  }

  public playSwordThrow(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.18, 2100, 440, 0.056, 1.9);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.13);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playSwordSlash(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.16, 2600, 520, 0.068, 2.2);
    const blade = ctx.createOscillator();
    const g = ctx.createGain();
    blade.type = 'sawtooth';
    blade.frequency.setValueAtTime(780, now);
    blade.frequency.exponentialRampToValueAtTime(240, now + 0.12);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.042, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    blade.connect(g);
    g.connect(this.masterGain);
    blade.start(now);
    blade.stop(now + 0.15);
  }

  public playNpcStrike(kind: 'weapon' | 'punch'): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (kind === 'weapon') {
      this.playFilteredWhoosh(ctx, 0.14, 1500, 320, 0.046, 1.6);
    }
    const thud = ctx.createOscillator();
    const g = ctx.createGain();
    thud.type = kind === 'weapon' ? 'triangle' : 'sine';
    thud.frequency.setValueAtTime(kind === 'weapon' ? 210 : 145, now);
    thud.frequency.exponentialRampToValueAtTime(48, now + 0.11);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(kind === 'weapon' ? 0.062 : 0.058, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    thud.connect(g);
    g.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.14);
  }

  public playSwordEmbed(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const thud = ctx.createOscillator();
    const g = ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(260, now);
    thud.frequency.exponentialRampToValueAtTime(75, now + 0.12);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.072, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    thud.connect(g);
    g.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.15);
  }

  public playGreenCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.36, 240, 1280, 0.052, 2.2);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(410, now + 0.38);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.056, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playGreenExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.56, 1480, 110, 0.095, 1.3);
    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(215, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.48);
    sGain.gain.setValueAtTime(0.0001, now);
    sGain.gain.linearRampToValueAtTime(0.105, now + 0.015);
    sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
    sub.connect(sGain);
    sGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.54);
  }

  public playSpinningLeap(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.34, 340, 1720, 0.058, 1.8);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.26);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playHeroLanding(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.22, 620, 95, 0.068, 1.4);
    const thud = ctx.createOscillator();
    const g = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(160, now);
    thud.frequency.exponentialRampToValueAtTime(48, now + 0.22);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.088, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    thud.connect(g);
    g.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.26);
  }

  public playGroundSword(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.44, 960, 130, 0.085, 1.4);
    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(185, now);
    sub.frequency.exponentialRampToValueAtTime(44, now + 0.4);
    sGain.gain.setValueAtTime(0.0001, now);
    sGain.gain.linearRampToValueAtTime(0.095, now + 0.016);
    sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.44);
    sub.connect(sGain);
    sGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.46);
  }

  public playMagnetoThrow(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.22, 920, 220, 0.062, 2.1);
    const clang = ctx.createOscillator();
    const g = ctx.createGain();
    clang.type = 'sawtooth';
    clang.frequency.setValueAtTime(340, now);
    clang.frequency.exponentialRampToValueAtTime(110, now + 0.16);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.048, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    clang.connect(g);
    g.connect(this.masterGain);
    clang.start(now);
    clang.stop(now + 0.2);
  }

  public playMagnetoMeteorCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.72, 160, 720, 0.064, 2.4);
    const hum = ctx.createOscillator();
    const g = ctx.createGain();
    hum.type = 'sawtooth';
    hum.frequency.setValueAtTime(98, now);
    hum.frequency.exponentialRampToValueAtTime(220, now + 0.75);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.052, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    hum.connect(g);
    g.connect(this.masterGain);
    hum.start(now);
    hum.stop(now + 0.82);
  }

  public playMagnetoMeteorImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.62, 1200, 95, 0.1, 1.3);
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(155, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + 0.56);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.115, now + 0.016);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    sub.connect(g);
    g.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.62);
  }

  public playMagnetoShield(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(active ? 220 : 480, now);
    osc.frequency.exponentialRampToValueAtTime(active ? 540 : 180, now + 0.24);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.058, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playMagnetoTornado(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.58, 180, 1450, 0.072, 2.0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.48);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.048, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.54);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.56);
  }

  public playQuicksilverSpeed(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.22, active ? 320 : 2200, active ? 2800 : 380, 0.062, 2.6);
    const zap = ctx.createOscillator();
    const g = ctx.createGain();
    zap.type = 'triangle';
    zap.frequency.setValueAtTime(active ? 440 : 1120, now);
    zap.frequency.exponentialRampToValueAtTime(active ? 1480 : 320, now + 0.16);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.046, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    zap.connect(g);
    g.connect(this.masterGain);
    zap.start(now);
    zap.stop(now + 0.2);
  }

  public playQuicksilverPunch(finisher = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, finisher ? 0.26 : 0.09, 1900, 260, finisher ? 0.088 : 0.044, 1.8);
    const thud = ctx.createOscillator();
    const g = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(finisher ? 220 : 170, now);
    thud.frequency.exponentialRampToValueAtTime(finisher ? 38 : 58, now + (finisher ? 0.28 : 0.08));
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(finisher ? 0.105 : 0.056, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + (finisher ? 0.3 : 0.09));
    thud.connect(g);
    g.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + (finisher ? 0.32 : 0.1));
  }

  public playTimeStop(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.55, 1600, 75, 0.082, 1.4);
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(240, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.58);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.092, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
    sub.connect(g);
    g.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.64);
  }

  public playStrangeShield(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const notes = active ? [392.0, 587.33, 880.0] : [587.33, 392.0];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.025;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.045, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.27);
    });
  }

  public playStrangeClones(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.42, 420, 1950, 0.06, 2.4);
    const notes = [440, 659.25, 880, 1174.66];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.032;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.04, t0 + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.36);
    });
  }

  public playEldritchDiscCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.18, 1950, 720, 0.055, 2.5);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(740, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.15);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.052, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playEldritchDiscImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.16, 2400, 480, 0.06, 2.0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.13);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playAstralExtraction(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.34, 360, 2100, 0.072, 2.2);
    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, now + 0.1);
    sub.frequency.exponentialRampToValueAtTime(48, now + 0.55);
    sg.gain.setValueAtTime(0.0001, now);
    sg.gain.linearRampToValueAtTime(0.095, now + 0.14);
    sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    sub.connect(sg);
    sg.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.62);

    [659.25, 987.77, 1318.5].forEach((freq, idx) => {
      const t0 = now + 0.12 + idx * 0.04;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.038, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.44);
    });
  }

  public playPhoenixDiveLaunch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.38, 440, 2300, 0.078, 2.0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.32);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.052, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playPhoenixDiveImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.48, 1900, 190, 0.095, 1.5);
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(195, now);
    sub.frequency.exponentialRampToValueAtTime(40, now + 0.44);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.11, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
    sub.connect(g);
    g.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.5);
  }

  public playVisionBoltSmall(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.11);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.036, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playVisionPhase(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(active ? 540 : 980, now);
    osc.frequency.exponentialRampToValueAtTime(active ? 1040 : 480, now + 0.22);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playVisionLaser(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.52, 880, 1860, 0.052, 3.0);
    const beam = ctx.createOscillator();
    const g = ctx.createGain();
    beam.type = 'sawtooth';
    beam.frequency.setValueAtTime(420, now);
    beam.frequency.linearRampToValueAtTime(520, now + 0.35);
    beam.frequency.exponentialRampToValueAtTime(240, now + 0.72);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.044, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.76);
    beam.connect(g);
    g.connect(this.masterGain);
    beam.start(now);
    beam.stop(now + 0.78);
  }

  public playVisionBolt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.14);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.058, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playVisionHeadGrip(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.3, 420, 1450, 0.056, 2.2);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(310, now + 0.36);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.056, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playAstralToggle(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(
      ctx,
      0.28,
      active ? 640 : 1280,
      active ? 1680 : 540,
      0.048,
      2.4,
    );
    const notes = active ? [587.33, 880, 1174.66] : [880, 587.33];
    notes.forEach((freq, idx) => {
      const t0 = now + idx * 0.032;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.04, t0 + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
  }

  public playVisionBoltCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.44, 380, 1950, 0.044, 2.8);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(1120, now + 0.48);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.046, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playVisionBoltExplode(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.36, 1800, 260, 0.08, 1.8);
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(210, now);
    sub.frequency.exponentialRampToValueAtTime(48, now + 0.34);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.095, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    sub.connect(g);
    g.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.38);
  }

  public playKillHeal(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const t0 = now + idx * 0.04;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.036, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.26);
    });
  }

  public playAgathaBolt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.22, 1300, 280, 0.065, 2.2);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playAgathaExplosionCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.52);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.07, now + 0.14);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.54);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.56);
  }

  public playAgathaExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.48, 1600, 140, 0.11, 1.5);
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + 0.45);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
    sub.connect(g);
    g.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.5);
  }

  public playAgathaDrainStart(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(390, now + 0.35);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.065, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.47);
  }

  public playAgathaShield(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(active ? 190 : 340, now);
    osc.frequency.exponentialRampToValueAtTime(active ? 380 : 150, now + 0.24);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.065, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playAgathaShieldExplode(): void {
    this.playAgathaExplosion();
  }

  public playChaosDrainStart(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.28, 950, 420, 0.055, 2.0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.26);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.045, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playChaosDrainBolt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.24, 1500, 260, 0.08, 2.0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.22);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.075, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playZombieBeam(): void {
    this.playChaosDrainStart();
  }

  public playZombieStoneCharge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(82, now);
    sub.frequency.exponentialRampToValueAtTime(240, now + 1.15);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.08, now + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
    sub.connect(g);
    g.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 1.28);
  }

  public playZombieStoneExplode(): void {
    this.playAgathaExplosion();
  }

  public playPistolShot(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.09, 2400, 420, 0.072, 1.5);
    const snap = ctx.createOscillator();
    const g = ctx.createGain();
    snap.type = 'sawtooth';
    snap.frequency.setValueAtTime(340, now);
    snap.frequency.exponentialRampToValueAtTime(72, now + 0.085);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.068, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);
    snap.connect(g);
    g.connect(this.masterGain);
    snap.start(now);
    snap.stop(now + 0.11);
  }

  public playShieldBreak(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.28, 2200, 320, 0.082, 1.8);
    const notes = [880, 587.33, 329.63];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.025;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t0);
      osc.frequency.exponentialRampToValueAtTime(f * 0.65, t0 + 0.14);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.056, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.18);
    });
  }

  public playRockBreak(intensity = 1): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const amp = Math.min(1.4, Math.max(0.6, intensity));
    this.playFilteredWhoosh(ctx, 0.24, 920, 120, 0.062 * amp, 1.4);
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(145, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.22);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.075 * amp, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    sub.connect(g);
    g.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.26);
  }

  public playPurgatoryGrasp(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.36, 1750, 220, 0.085, 2.4);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.34);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.085, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playInvisibilityToggle(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(
      ctx,
      0.34,
      active ? 1850 : 620,
      active ? 540 : 1720,
      0.068,
      2.2,
    );
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(active ? 740 : 420, now);
    osc.frequency.exponentialRampToValueAtTime(active ? 380 : 780, now + 0.32);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playForcefieldShield(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.24, active ? 680 : 1200, active ? 1320 : 460, 0.062, 1.9);
    const notes = active ? [392, 523.25] : [493.88, 329.63];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.04;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.052, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    });
  }

  public playForcefieldTransfer(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.3, 1400, 620, 0.072, 2.0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(860, now + 0.26);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.065, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playForcefieldProtection(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const t0 = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.048, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.28);
    });
  }

  public playForcefieldSuffocation(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.36, 980, 260, 0.075, 2.6);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(98, now + 0.32);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playForcefieldBarrierCast(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.26, 1700, 420, 0.078, 2.0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.24);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.07, now + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playForcefieldBarrierHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.playFilteredWhoosh(ctx, 0.22, 2100, 320, 0.088, 1.8);
    const sub = ctx.createOscillator();
    const g = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(195, now);
    sub.frequency.exponentialRampToValueAtTime(58, now + 0.22);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.095, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    sub.connect(g);
    g.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.26);
  }

  public dispose(): void {
    this.disposed = true;
    try {
      if (this.ambientGain && this.ctx) {
        this.ambientGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      }
      if (this.flightGain && this.ctx) {
        this.flightGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      }
      if (this.painGain && this.ctx) {
        this.painGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      }
      this.ambientSource?.stop();
      this.ambientLfo?.stop();
      this.flightOscA?.stop();
      this.flightOscB?.stop();
      this.flightLfo?.stop();
      this.painOscA?.stop();
      this.painOscB?.stop();
      this.painLfo?.stop();
    } catch {
      // Ignore already stopped audio nodes
    }
    this.ambientSource = null;
    this.ambientLfo = null;
    this.ambientGain = null;
    this.flightOscA = null;
    this.flightOscB = null;
    this.flightLfo = null;
    this.flightGain = null;
    this.painOscA = null;
    this.painOscB = null;
    this.painLfo = null;
    this.painGain = null;

    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.masterGain = null;
    this.whiteNoiseBuffer = null;
  }
}
