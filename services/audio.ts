import type { UserSettings } from '../types';
import crystalClickSfx from '../assets/audio/light-chime-of-crystal.mp3';
import winePourSfx from '../assets/audio/bottle-of-wine-wine-is-poured-into-a-glass.mp3';
import timerWinSfx from '../assets/audio/floraphonic-90s-game-ui-6-185099.mp3';
import timerMissSfx from '../assets/audio/universfield-video-game-bonus-323603.mp3';

type SfxSampleKey = 'click' | 'pour' | 'timerWin' | 'timerMiss';

const SFX_SAMPLE_URLS: Record<SfxSampleKey, string> = {
  click: crystalClickSfx,
  pour: winePourSfx,
  timerWin: timerWinSfx,
  timerMiss: timerMissSfx,
};

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
  private sfxRawCache = new Map<SfxSampleKey, Promise<ArrayBuffer | null>>();
  private sfxBufferCache = new Map<SfxSampleKey, AudioBuffer>();
  private sfxDecodePromises = new Map<SfxSampleKey, Promise<AudioBuffer | null>>();
  private pouringRequested = false;
  private activePour: {
    source: AudioBufferSourceNode;
    gain: GainNode;
    stopTimer?: ReturnType<typeof setTimeout>;
  } | null = null;
  private fallbackPourAudio: HTMLAudioElement | null = null;

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

      this.preloadRawSamples();
    }
  }

  private preloadRawSamples() {
    if (typeof fetch === 'undefined') return;
    (Object.keys(SFX_SAMPLE_URLS) as SfxSampleKey[]).forEach((key) => {
      void this.fetchRawSample(key);
    });
  }

  private fetchRawSample(key: SfxSampleKey): Promise<ArrayBuffer | null> {
    const existing = this.sfxRawCache.get(key);
    if (existing) return existing;
    if (typeof fetch === 'undefined') return Promise.resolve(null);

    const request = fetch(SFX_SAMPLE_URLS[key])
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to fetch audio sample: ${key}`);
        return response.arrayBuffer();
      })
      .catch((error) => {
        console.warn(`Audio sample preload failed (${key}):`, error);
        return null;
      });
    this.sfxRawCache.set(key, request);
    return request;
  }

  private loadSampleBuffer(key: SfxSampleKey, ctx: AudioContext): Promise<AudioBuffer | null> {
    const cached = this.sfxBufferCache.get(key);
    if (cached) return Promise.resolve(cached);

    const pending = this.sfxDecodePromises.get(key);
    if (pending) return pending;

    const task = this.fetchRawSample(key)
      .then(async (raw) => {
        if (!raw) return null;
        const decoded = await ctx.decodeAudioData(raw.slice(0));
        this.sfxBufferCache.set(key, decoded);
        return decoded;
      })
      .catch((error) => {
        console.warn(`Audio sample decode failed (${key}):`, error);
        return null;
      })
      .finally(() => {
        this.sfxDecodePromises.delete(key);
      });

    this.sfxDecodePromises.set(key, task);
    return task;
  }

  private decodeAllSamples(ctx: AudioContext) {
    (Object.keys(SFX_SAMPLE_URLS) as SfxSampleKey[]).forEach((key) => {
      void this.loadSampleBuffer(key, ctx);
    });
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
        this.decodeAllSamples(this.ctx);
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

  private playFallbackElement(key: SfxSampleKey, gainScale: number, loop = false): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    try {
      const audio = new Audio(SFX_SAMPLE_URLS[key]);
      audio.loop = loop;
      const master = this.settings.muted ? 0 : Math.max(0, Math.min(1, this.settings.masterVolume / 100));
      const sfx = Math.max(0, Math.min(1, this.settings.sfxVolume / 100));
      audio.volume = Math.max(0, Math.min(1, master * sfx * gainScale));
      void audio.play().catch(() => {});
      return audio;
    } catch {
      return null;
    }
  }

  private playSample(key: SfxSampleKey, gainScale = 1) {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) {
      this.playFallbackElement(key, gainScale);
      return;
    }

    const buffer = this.sfxBufferCache.get(key);
    if (!buffer) {
      void this.loadSampleBuffer(key, ctx);
      this.playFallbackElement(key, gainScale);
      return;
    }

    try {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(gainScale, ctx.currentTime);
      source.connect(gain);
      gain.connect(this.sfxGain);
      source.addEventListener('ended', () => {
        try {
          source.disconnect();
          gain.disconnect();
        } catch {}
      }, { once: true });
      source.start();
    } catch {
      this.playFallbackElement(key, gainScale);
    }
  }

  /**
   * Crystal chime button click sound (assets/audio/light-chime-of-crystal.mp3)
   */
  public playClick() {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const now = performance.now();
    if (now - this.lastClickSoundAt < 50) return;
    this.lastClickSoundAt = now;
    this.playSample('click', 0.9);
  }

  private startPourSource(ctx: AudioContext, buffer: AudioBuffer) {
    if (!this.sfxGain || this.activePour || !this.pouringRequested) return;
    try {
      const t = ctx.currentTime;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.85, t + 0.12);

      source.connect(gain);
      gain.connect(this.sfxGain);
      source.start(t);

      this.activePour = { source, gain };
    } catch (error) {
      console.warn('Wine pouring sound could not be started:', error);
    }
  }

  /**
   * Looped wine pouring asset (assets/audio/bottle-of-wine-wine-is-poured-into-a-glass.mp3)
   */
  public startPouring() {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    if (this.pouringRequested || this.activePour) return;
    this.pouringRequested = true;

    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) {
      this.fallbackPourAudio = this.playFallbackElement('pour', 0.85, true);
      return;
    }

    const buffer = this.sfxBufferCache.get('pour');
    if (buffer) {
      this.startPourSource(ctx, buffer);
      return;
    }

    void this.loadSampleBuffer('pour', ctx).then((decoded) => {
      if (!this.pouringRequested || this.activePour) return;
      if (decoded && this.ctx && this.sfxGain) {
        this.startPourSource(this.ctx, decoded);
      } else {
        this.fallbackPourAudio = this.playFallbackElement('pour', 0.85, true);
      }
    });
  }

  public stopPouring() {
    this.pouringRequested = false;

    if (this.fallbackPourAudio) {
      try {
        this.fallbackPourAudio.pause();
        this.fallbackPourAudio.currentTime = 0;
      } catch {}
      this.fallbackPourAudio = null;
    }

    const pour = this.activePour;
    if (!pour || !this.ctx) return;

    this.activePour = null;
    const t = this.ctx.currentTime;

    try {
      pour.gain.gain.cancelScheduledValues(t);
      pour.gain.gain.setTargetAtTime(0.0001, t, 0.03);
      pour.stopTimer = setTimeout(() => {
        try {
          pour.source.stop();
          pour.source.disconnect();
          pour.gain.disconnect();
        } catch {}
      }, 140);
    } catch {
      // Guard
    }
  }

  /**
   * Stop the Clock Challenge win SFX (assets/audio/floraphonic-90s-game-ui-6-185099.mp3)
   */
  public playTimerWin() {
    this.playSample('timerWin', 0.95);
  }

  /**
   * Stop the Clock Challenge miss / "Thank you" SFX (assets/audio/universfield-video-game-bonus-323603.mp3)
   */
  public playTimerMiss() {
    this.playSample('timerMiss', 0.95);
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
