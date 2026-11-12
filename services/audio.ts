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

        // 1. Master Output Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);

        // 2. SFX Bus
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.masterGain);

        // Route the looping media through Web Audio for tablet volume controls.
        this.musicGain = this.ctx.createGain();
        this.musicGain.connect(this.masterGain);

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

  public playClick() {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1100, t);
      osc.frequency.exponentialRampToValueAtTime(280, t + 0.045);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.38, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch {
      // Guard
    }
  }

  public playSuccess() {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const t = ctx.currentTime;
      const harmonics = [
        { freq: 1046.5, gain: 0.28, decay: 0.35 },
        { freq: 1568.0, gain: 0.45, decay: 0.48 },
        { freq: 2349.3, gain: 0.32, decay: 0.4 },
        { freq: 3136.0, gain: 0.18, decay: 0.28 },
      ];

      harmonics.forEach(({ freq, gain: hGain, decay }) => {
        if (!ctx || !this.sfxGain) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(hGain, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + decay + 0.02);
      });
    } catch {
      // Guard
    }
  }

  public playFail() {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(170, t);
      osc.frequency.exponentialRampToValueAtTime(75, t + 0.16);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.42, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.18);
    } catch {
      // Guard
    }
  }

  public playCountdown(isGo = false) {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

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
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.15);
      } else {
        [1318.5, 1760.0].forEach((freq, idx) => {
          if (!ctx || !this.sfxGain) return;
          const noteStart = t + idx * 0.07;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteStart);

          gain.gain.setValueAtTime(0.0001, noteStart);
          gain.gain.linearRampToValueAtTime(0.45, noteStart + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.28);

          osc.connect(gain);
          gain.connect(this.sfxGain);

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

    try {
      const t = ctx.currentTime;

      // Champagne Cork Pop
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();

      popOsc.type = 'sine';
      popOsc.frequency.setValueAtTime(320, t);
      popOsc.frequency.exponentialRampToValueAtTime(80, t + 0.045);

      popGain.gain.setValueAtTime(0.0001, t);
      popGain.gain.linearRampToValueAtTime(0.55, t + 0.003);
      popGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

      popOsc.connect(popGain);
      popGain.connect(this.sfxGain);

      popOsc.start(t);
      popOsc.stop(t + 0.05);

      // Joyous Sparkling Fanfare (C5, E5, G5, B5, C6, E6)
      const arpeggio = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5];
      arpeggio.forEach((freq, idx) => {
        if (!ctx || !this.sfxGain) return;
        const noteStart = t + 0.06 + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.linearRampToValueAtTime(0.35, noteStart + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);

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
