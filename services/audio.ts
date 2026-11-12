import type { UserSettings } from '../types';

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private music: HTMLAudioElement | null = null;
  private musicPending = false;
  private videoActive = false;
  private isMusicPlaying = false;
  private musicWanted = false;
  private isDucked = false;
  private lastClickSoundAt = 0;
  private activePour: {
    sources: AudioBufferSourceNode[];
    oscillators: OscillatorNode[];
    masterGain: GainNode;
  } | null = null;

  private settings: UserSettings = {
    masterVolume: 80,
    musicVolume: 65,
    sfxVolume: 85,
    muted: false,
    haptics: true,
    reducedMotion: false,
    theme: 'auto',
    language: 'en',
    difficulty: 'normal',
  };

  constructor() {
    if (typeof window !== 'undefined') {
      const handleUserGesture = () => {
        this.unlock();
      };
      window.addEventListener('pointerdown', handleUserGesture, { passive: true });
      window.addEventListener('touchstart', handleUserGesture, { passive: true });
      window.addEventListener('keydown', handleUserGesture, { passive: true });
      window.addEventListener('click', handleUserGesture, { passive: true });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.ctx) {
          if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
          }
          if (this.musicWanted && !this.isMusicPlaying) {
            this.startMusic();
          }
        }
      });
    }
  }

  /**
   * Initializes AudioContext and master routing graph
   */
  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();

        // 1. Studio Dynamics Compressor / Peak Limiter (prevents harsh clipping & adds warmth)
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-2, this.ctx.currentTime);
        compressor.knee.setValueAtTime(6, this.ctx.currentTime);
        compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

        // 2. Master Output Gain
        this.masterGain = this.ctx.createGain();
        compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // 3. SFX Bus
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(compressor);

        // 4. Music Bus
        this.musicGain = this.ctx.createGain();
        this.musicGain.connect(compressor);

        this.applyVolumes();
      } catch (err) {
        console.warn('Web Audio initialization error:', err);
        return null;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.musicWanted && !this.isMusicPlaying) {
          this.startMusic();
        }
      }).catch(() => {});
    }

    return this.ctx;
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const master = this.settings.muted ? 0 : Math.max(0, Math.min(1, this.settings.masterVolume / 100));
    const sfx = Math.max(0, Math.min(1, this.settings.sfxVolume / 100));
    const musicScale = this.isDucked ? 0.28 : 1;
    const music = Math.max(0, Math.min(1, this.settings.musicVolume / 100)) * musicScale;

    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(master, t, 0.05);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(sfx, t, 0.05);
    }
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(music, t, 0.08);
    }
  }

  public updateSettings(newSettings: UserSettings) {
    this.settings = newSettings;
    this.applyVolumes();
    if (this.settings.muted) {
      this.stopPouring();
      this.pauseMusic();
    } else if (this.musicWanted && !this.isMusicPlaying) {
      this.resumeMusic();
    }
  }

  public get isUnlocked(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  public async unlock(): Promise<boolean> {
    const ctx = this.ensureContext();
    if (!ctx) return false;

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      // Trigger instant 1-sample zero buffer to permanently clear mobile user-gesture audio restrictions
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch {
        // Safe fallback
      }

      if (this.musicWanted || !this.isMusicPlaying) {
        this.startMusic();
      }
      return true;
    } catch {
      return false;
    }
  }

  // ==============================================================================
  // SOUND EFFECTS
  // ==============================================================================

  /**
   * Generates a calibrated pink noise buffer using Paul Kellet's 7-pole filter
   * Gives natural 1/f spectral rolloff essential for authentic fluid dynamics
   */
  private getPinkNoiseBuffer(ctx: AudioContext, durationSec = 3.5): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.15;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  /**
   * Tactile vintage mechanical brass & wooden latch stop click
   * Multi-layered physical transient: crisp tactile snap + warm oak thump + metallic latch ping
   */
  public playClick() {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const now = performance.now();
    if (now - this.lastClickSoundAt < 50) return;
    this.lastClickSoundAt = now;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const t = ctx.currentTime;

      // Layer 1: Crisp tactile mechanical snap (bandpass transient impulse)
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      const snapFilter = ctx.createBiquadFilter();

      snapFilter.type = 'bandpass';
      snapFilter.frequency.setValueAtTime(1850, t);
      snapFilter.Q.setValueAtTime(1.4, t);

      snapOsc.type = 'triangle';
      snapOsc.frequency.setValueAtTime(2600, t);
      snapOsc.frequency.exponentialRampToValueAtTime(540, t + 0.03);

      snapGain.gain.setValueAtTime(0.0001, t);
      snapGain.gain.linearRampToValueAtTime(0.68, t + 0.002);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);

      snapOsc.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(this.sfxGain);

      snapOsc.start(t);
      snapOsc.stop(t + 0.035);

      // Layer 2: Warm vintage oak / brass chassis thump (acoustic presence)
      const thumpOsc = ctx.createOscillator();
      const thumpGain = ctx.createGain();

      thumpOsc.type = 'sine';
      thumpOsc.frequency.setValueAtTime(420, t);
      thumpOsc.frequency.exponentialRampToValueAtTime(140, t + 0.05);

      thumpGain.gain.setValueAtTime(0.0001, t);
      thumpGain.gain.linearRampToValueAtTime(0.46, t + 0.003);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);

      thumpOsc.connect(thumpGain);
      thumpGain.connect(this.sfxGain);

      thumpOsc.start(t);
      thumpOsc.stop(t + 0.06);

      // Layer 3: Delicate high metallic latch accent (audible on small speakers & kiosks)
      const metalOsc = ctx.createOscillator();
      const metalGain = ctx.createGain();
      metalOsc.type = 'sine';
      metalOsc.frequency.setValueAtTime(3200, t);
      metalOsc.frequency.exponentialRampToValueAtTime(1800, t + 0.02);

      metalGain.gain.setValueAtTime(0.0001, t);
      metalGain.gain.linearRampToValueAtTime(0.24, t + 0.001);
      metalGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);

      metalOsc.connect(metalGain);
      metalGain.connect(this.sfxGain);

      metalOsc.start(t);
      metalOsc.stop(t + 0.025);
    } catch {
      // Guard
    }
  }

  /**
   * Sommelier-grade Physical Acoustic Model of Vintage Wine Pouring
   * - Pink-noise fluid turbulence (velvety liquid stream)
   * - Bottle neck pressure glug LFO modulation (~4.2Hz surging rhythm)
   * - Minnaert aeration & effervescent micro-bubble bursts
   * - Rising cavity formant filter (simulating liquid filling the crystal glass)
   */
  public startPouring(expectedDuration = 23) {
    if (this.settings.muted || this.settings.sfxVolume <= 0 || this.activePour) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const t = ctx.currentTime;
      const masterPourGain = ctx.createGain();
      masterPourGain.gain.setValueAtTime(0.0001, t);
      masterPourGain.gain.linearRampToValueAtTime(0.48, t + 0.16);

      // --- Layer 1: Velvety Fluid Stream & Glass Cavity Resonance ---
      const streamBuffer = this.getPinkNoiseBuffer(ctx, 3.5);
      const streamSource = ctx.createBufferSource();
      streamSource.buffer = streamBuffer;
      streamSource.loop = true;

      const cavityFilter = ctx.createBiquadFilter();
      cavityFilter.type = 'bandpass';
      cavityFilter.frequency.setValueAtTime(560, t);
      // As wine fills the glass, air column shortens and resonant pitch rises
      cavityFilter.frequency.exponentialRampToValueAtTime(940, t + Math.max(6, expectedDuration));
      cavityFilter.Q.setValueAtTime(1.6, t);

      const streamGain = ctx.createGain();
      streamGain.gain.setValueAtTime(0.85, t);

      streamSource.connect(cavityFilter);
      cavityFilter.connect(streamGain);
      streamGain.connect(masterPourGain);

      // --- Layer 2: Bottle Neck Liquid Glug & Surge (4.2Hz Surge Rhythm) ---
      const glugLfo = ctx.createOscillator();
      glugLfo.type = 'sine';
      glugLfo.frequency.setValueAtTime(4.2, t);

      const glugFreqMod = ctx.createGain();
      glugFreqMod.gain.setValueAtTime(140, t);
      glugLfo.connect(glugFreqMod);
      glugFreqMod.connect(cavityFilter.frequency);

      const glugAmpMod = ctx.createGain();
      glugAmpMod.gain.setValueAtTime(0.18, t);
      glugLfo.connect(glugAmpMod);
      glugAmpMod.connect(streamGain.gain);

      // --- Layer 3: Aeration & Effervescent Micro-Bubbles (Minnaert Resonators) ---
      const bubbleBuffer = this.getPinkNoiseBuffer(ctx, 2.5);
      const bubbleSource = ctx.createBufferSource();
      bubbleSource.buffer = bubbleBuffer;
      bubbleSource.loop = true;

      const bubbleFilter = ctx.createBiquadFilter();
      bubbleFilter.type = 'bandpass';
      bubbleFilter.frequency.setValueAtTime(1750, t);
      bubbleFilter.Q.setValueAtTime(3.6, t);

      const bubbleGain = ctx.createGain();
      bubbleGain.gain.setValueAtTime(0.38, t);

      const bubbleLfo = ctx.createOscillator();
      bubbleLfo.type = 'triangle';
      bubbleLfo.frequency.setValueAtTime(6.9, t);

      const bubbleLfoMod = ctx.createGain();
      bubbleLfoMod.gain.setValueAtTime(0.18, t);
      bubbleLfo.connect(bubbleLfoMod);
      bubbleLfoMod.connect(bubbleGain.gain);

      bubbleSource.connect(bubbleFilter);
      bubbleFilter.connect(bubbleGain);
      bubbleGain.connect(masterPourGain);

      // --- Layer 4: Crystal Stemware Body Shimmer ---
      const crystalPeaking = ctx.createBiquadFilter();
      crystalPeaking.type = 'peaking';
      crystalPeaking.frequency.setValueAtTime(2480, t);
      crystalPeaking.Q.setValueAtTime(4.0, t);
      crystalPeaking.gain.setValueAtTime(3.5, t);

      masterPourGain.connect(crystalPeaking);
      crystalPeaking.connect(this.sfxGain);

      streamSource.start(t);
      bubbleSource.start(t);
      glugLfo.start(t);
      bubbleLfo.start(t);

      this.activePour = {
        sources: [streamSource, bubbleSource],
        oscillators: [glugLfo, bubbleLfo],
        masterGain: masterPourGain,
      };
    } catch (error) {
      console.warn('Wine pouring sound could not be started:', error);
    }
  }

  /**
   * Graceful deceleration and settling droplet pop when pouring stops
   */
  public stopPouring() {
    const pour = this.activePour;
    if (!pour || !this.ctx) return;

    this.activePour = null;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    try {
      pour.masterGain.gain.cancelScheduledValues(t);
      pour.masterGain.gain.setTargetAtTime(0.0001, t, 0.035);

      // Delicate settling wine droplets hitting the filled glass
      this.playDropletSettleAt(t + 0.04);
      this.playDropletSettleAt(t + 0.11, 0.7);

      setTimeout(() => {
        try {
          pour.sources.forEach((s) => {
            try { s.stop(); s.disconnect(); } catch {}
          });
          pour.oscillators.forEach((o) => {
            try { o.stop(); o.disconnect(); } catch {}
          });
          pour.masterGain.disconnect();
        } catch {}
      }, 180);
    } catch {
      // Guard
    }
  }

  /**
   * Realistic acoustic liquid droplet settling pop into wine glass
   */
  private playDropletSettleAt(time: number, intensity = 1.0) {
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const sfxGain = this.sfxGain;

    try {
      // Fluid surface droplet chirp
      const dropOsc = ctx.createOscillator();
      const dropGain = ctx.createGain();
      const dropFilter = ctx.createBiquadFilter();

      dropFilter.type = 'bandpass';
      dropFilter.frequency.setValueAtTime(980, time);
      dropFilter.Q.setValueAtTime(2.8, time);

      dropOsc.type = 'sine';
      dropOsc.frequency.setValueAtTime(1150 * intensity, time);
      dropOsc.frequency.exponentialRampToValueAtTime(420, time + 0.04);

      dropGain.gain.setValueAtTime(0.0001, time);
      dropGain.gain.linearRampToValueAtTime(0.32 * intensity, time + 0.002);
      dropGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);

      dropOsc.connect(dropFilter);
      dropFilter.connect(dropGain);
      dropGain.connect(sfxGain);

      dropOsc.start(time);
      dropOsc.stop(time + 0.05);

      // Glass surface ring
      const ringOsc = ctx.createOscillator();
      const ringGain = ctx.createGain();

      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(2489, time);

      ringGain.gain.setValueAtTime(0.0001, time);
      ringGain.gain.linearRampToValueAtTime(0.12 * intensity, time + 0.002);
      ringGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);

      ringOsc.connect(ringGain);
      ringGain.connect(sfxGain);

      ringOsc.start(time);
      ringOsc.stop(time + 0.04);
    } catch {
      // Guard
    }
  }

  /**
   * Physical acoustic model of a crystal wine glass clinking ("Santé! / Cheers! 🥂")
   */
  private playGlassClinkAt(time: number, baseFreq: number, intensity = 0.4) {
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const sfxGain = this.sfxGain;

    // Physical modal frequencies of crystal wine glass
    // Non-harmonic modes with slight frequency beating creating a natural singing shimmer
    const modes = [
      { f: baseFreq, g: intensity, decay: 1.3 },
      { f: baseFreq + 5.2, g: intensity * 0.72, decay: 1.15 }, // Beating frequency
      { f: baseFreq * 2.02, g: intensity * 0.38, decay: 0.75 },
      { f: baseFreq * 3.15, g: intensity * 0.2, decay: 0.5 },
      { f: baseFreq * 4.4, g: intensity * 0.12, decay: 0.32 },
    ];

    // Sharp ceramic/crystal tap transient
    const tapOsc = ctx.createOscillator();
    const tapGain = ctx.createGain();
    const tapFilter = ctx.createBiquadFilter();

    tapFilter.type = 'highpass';
    tapFilter.frequency.setValueAtTime(3200, time);

    tapOsc.type = 'triangle';
    tapOsc.frequency.setValueAtTime(4200, time);
    tapOsc.frequency.exponentialRampToValueAtTime(1800, time + 0.015);

    tapGain.gain.setValueAtTime(0.0001, time);
    tapGain.gain.linearRampToValueAtTime(intensity * 0.55, time + 0.002);
    tapGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.015);

    tapOsc.connect(tapFilter);
    tapFilter.connect(tapGain);
    tapGain.connect(sfxGain);

    tapOsc.start(time);
    tapOsc.stop(time + 0.02);

    // Resonant singing glass modes
    modes.forEach(({ f, g, decay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, time);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(g, time + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

      osc.connect(gain);
      gain.connect(sfxGain);

      osc.start(time);
      osc.stop(time + decay + 0.02);
    });
  }

  /**
   * Champagne Cork Pop (Acoustic Cavitation + Gas Fizz)
   */
  private playCorkPopAt(time: number) {
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const sfxGain = this.sfxGain;

    // 1. Low pressure cavity thud
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();

    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(380, time);
    popOsc.frequency.exponentialRampToValueAtTime(65, time + 0.045);

    popGain.gain.setValueAtTime(0.0001, time);
    popGain.gain.linearRampToValueAtTime(0.48, time + 0.002);
    popGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

    popOsc.connect(popGain);
    popGain.connect(sfxGain);

    popOsc.start(time);
    popOsc.stop(time + 0.055);

    // 2. High fizzy hiss
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.06);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(2800, time);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, time);
      noiseGain.gain.linearRampToValueAtTime(0.16, time + 0.003);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(sfxGain);

      noise.start(time);
      noise.stop(time + 0.065);
    } catch {
      // Fallback
    }
  }

  /**
   * Triumphant Crystal Wine Glass Toast + Champagne Pop + Golden Celesta Fanfare
   */
  public playSuccess() {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const sfxGain = this.sfxGain;

    try {
      const t = ctx.currentTime;

      // Part 1: Champagne Cork Pop
      this.playCorkPopAt(t);

      // Part 2: Realistic Crystal Wine Glass Clink (Two glasses toasting)
      // Glass 1: Fundamental resonance ~2489 Hz (D#7)
      this.playGlassClinkAt(t + 0.02, 2489.0, 0.42);
      // Glass 2: Second crystal glass impact slightly delayed ~2793 Hz (F7)
      this.playGlassClinkAt(t + 0.06, 2793.8, 0.32);

      // Part 3: Golden Celesta / Harp Fanfare (Ascending Pentatonic E5, G5, B5, E6, G6)
      const fanfareNotes = [659.25, 783.99, 987.77, 1318.51, 1567.98];
      fanfareNotes.forEach((freq, idx) => {
        const noteTime = t + 0.08 + idx * 0.055;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.0001, noteTime);
        gain.gain.linearRampToValueAtTime(0.26, noteTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.45);

        osc.connect(gain);
        gain.connect(sfxGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.48);
      });
    } catch {
      // Guard
    }
  }

  /**
   * Dramatic Vintage Estate Minor Chime & Decanter Thud (Game Over / Miss)
   */
  public playFail() {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const sfxGain = this.sfxGain;

    try {
      const t = ctx.currentTime;

      // 1. Muted wooden wine decanter thud
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();

      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(140, t);
      thudOsc.frequency.exponentialRampToValueAtTime(45, t + 0.18);

      thudGain.gain.setValueAtTime(0.0001, t);
      thudGain.gain.linearRampToValueAtTime(0.46, t + 0.005);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

      thudOsc.connect(thudGain);
      thudGain.connect(sfxGain);

      thudOsc.start(t);
      thudOsc.stop(t + 0.25);

      // 2. Descending minor estate chime (D4 -> Bb3 -> G3)
      const minorChimes = [
        { freq: 293.66, delay: 0, gain: 0.28, decay: 0.45 },
        { freq: 233.08, delay: 0.1, gain: 0.32, decay: 0.5 },
        { freq: 196.00, delay: 0.22, gain: 0.38, decay: 0.75 },
      ];

      minorChimes.forEach(({ freq, delay, gain: cGain, decay }) => {
        const noteStart = t + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(950, noteStart);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.linearRampToValueAtTime(cGain, noteStart + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + decay);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);

        osc.start(noteStart);
        osc.stop(noteStart + decay + 0.05);
      });
    } catch {
      // Guard
    }
  }

  /**
   * Rhythmic Stopwatch / Vintage Escapement Pour Cadence Tick
   */
  public playTimerTick(isTarget = false) {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isTarget ? 2200 : 1600, t);
      filter.Q.setValueAtTime(4.0, t);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isTarget ? 1760 : 1200, t);
      osc.frequency.exponentialRampToValueAtTime(isTarget ? 880 : 600, t + 0.025);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(isTarget ? 0.25 : 0.12, t + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.03);
    } catch {
      // Guard
    }
  }

  public playCountdown(isGo = false) {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const sfxGain = this.sfxGain;

    try {
      const t = ctx.currentTime;

      if (!isGo) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, t);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.4, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

        osc.connect(gain);
        gain.connect(sfxGain);

        osc.start(t);
        osc.stop(t + 0.15);
      } else {
        [1318.5, 1760.0].forEach((freq, idx) => {
          const noteStart = t + idx * 0.07;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteStart);

          gain.gain.setValueAtTime(0.0001, noteStart);
          gain.gain.linearRampToValueAtTime(0.45, noteStart + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.28);

          osc.connect(gain);
          gain.connect(sfxGain);

          osc.start(noteStart);
          osc.stop(noteStart + 0.3);
        });
      }
    } catch {
      // Guard
    }
  }

  public playLevelUp() {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const sfxGain = this.sfxGain;

    try {
      const t = ctx.currentTime;

      // Champagne Cork Pop
      this.playCorkPopAt(t);

      // Joyous Sparkling Fanfare (C5, E5, G5, B5, C6, E6)
      const arpeggio = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5];
      arpeggio.forEach((freq, idx) => {
        const noteStart = t + 0.06 + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.linearRampToValueAtTime(0.35, noteStart + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.35);

        osc.connect(gain);
        gain.connect(sfxGain);

        osc.start(noteStart);
        osc.stop(noteStart + 0.38);
      });
    } catch {
      // Guard
    }
  }

  // ==============================================================================
  // LOOPING EVENT BACKGROUND MUSIC
  // ==============================================================================

  public startMusic() {
    this.musicWanted = true;
    if (this.isMusicPlaying || this.musicPending || this.settings.muted || this.videoActive) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;
    try {
      if (!this.music) {
        this.music = new Audio('/Gvi%20Avp%202026%20(Final)%202.mp3');
        this.music.loop = true;
        this.music.preload = 'none';
        ctx.createMediaElementSource(this.music).connect(this.musicGain);
        this.music.addEventListener('error', () => {
          this.isMusicPlaying = false;
          console.error('Background audio could not be loaded:', this.music?.error);
          window.dispatchEvent(new Event('ppm-audio-error'));
        });
      }
      this.applyVolumes();
      this.musicPending = true;
      void this.music.play().then(() => {
        this.isMusicPlaying = !this.music!.paused;
      }).catch((error: unknown) => {
        console.warn('Background audio playback failed:', error);
        if (!(error instanceof DOMException) || !['NotAllowedError', 'AbortError'].includes(error.name)) {
          window.dispatchEvent(new Event('ppm-audio-error'));
        }
      }).finally(() => { this.musicPending = false; });
    } catch (error) {
      console.error('Background audio initialization failed:', error);
      window.dispatchEvent(new Event('ppm-audio-error'));
    }
  }

  public setVideoActive(active: boolean) {
    this.videoActive = active;
    if (active) this.pauseMusic();
    else if (this.musicWanted) this.resumeMusic();
  }

  public duckMusic() {
    this.isDucked = true;
    this.applyVolumes();
  }

  public unduckMusic() {
    this.isDucked = false;
    this.applyVolumes();
  }

  public pauseMusic() {
    this.isMusicPlaying = false;
    this.music?.pause();
  }

  public resumeMusic() {
    if (!this.settings.muted) {
      this.startMusic();
    }
  }

  public stopMusic() {
    this.musicWanted = false;
    this.pauseMusic();
    if (this.music) this.music.currentTime = 0;
  }
}

export const soundManager = new SoundManager();
