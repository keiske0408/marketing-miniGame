import type { UserSettings } from '../types';

interface MusicChord {
  bass: number;
  pad: number[];
  chime: number;
}

// Sophisticated 8-bar Wine Lounge Progression (chilled tempo, ~3.2s per bar)
const WINE_LOUNGE_CHORDS: MusicChord[] = [
  { bass: 87.31, pad: [220.0, 261.63, 329.63, 392.0], chime: 523.25 }, // Fmaj7 (F2 bass, A3, C4, E4, G4)
  { bass: 82.41, pad: [196.0, 246.94, 293.66, 392.0], chime: 493.88 }, // Em7 (E2 bass, G3, B3, D4, G4)
  { bass: 73.42, pad: [174.61, 220.0, 261.63, 329.63], chime: 440.0 },  // Dm9 (D2 bass, F3, A3, C4, E4)
  { bass: 65.41, pad: [164.81, 196.0, 246.94, 293.66], chime: 392.0 }, // Cmaj9 (C2 bass, E3, G3, B3, D4)
  { bass: 116.54, pad: [146.83, 174.61, 220.0, 293.66], chime: 349.23 }, // Bbmaj7 (Bb2 bass, D3, F3, A3, D4)
  { bass: 110.0, pad: [130.81, 164.81, 196.0, 261.63], chime: 329.63 },  // Am7 (A2 bass, C3, E3, G3, C4)
  { bass: 73.42, pad: [174.61, 220.0, 261.63, 349.23], chime: 440.0 },  // Dm7 (D2 bass, F3, A3, C4, F4)
  { bass: 98.0, pad: [174.61, 220.0, 246.94, 329.63], chime: 587.33 },  // G13sus (G2 bass, F3, A3, B3, E4)
];

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;

  private musicTimer: number | null = null;
  private isMusicPlaying = false;
  private musicWanted = false;
  private isDucked = false;
  private activeMusicOscs: OscillatorNode[] = [];
  private currentBar = 0;

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

        // 3. Music Bus with Warm Wine-Lounge Low-Pass Filter
        this.musicGain = this.ctx.createGain();
        this.musicFilter = this.ctx.createBiquadFilter();
        this.musicFilter.type = 'lowpass';
        // 2200Hz cutoff keeps warmth while ensuring luminous pads, chimes, and bass presence
        this.musicFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);
        this.musicFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

        this.musicGain.connect(this.musicFilter);
        this.musicFilter.connect(this.masterGain);

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
    // Music calibrated to rich, elegant ambient wine lounge presence
    const musicScale = this.isDucked ? 0.28 : 0.88;
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
  // AMBIENT WINE LOUNGE BACKGROUND MUSIC
  // ==============================================================================

  /**
   * Starts warm, audible, continuous ambient Wine Lounge background music
   */
  public startMusic() {
    this.musicWanted = true;
    if (this.isMusicPlaying || this.settings.muted) return;

    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        if (this.musicWanted && !this.isMusicPlaying) {
          this.startMusic();
        }
      }).catch(() => {});
      return;
    }

    try {
      this.isMusicPlaying = true;
      this.isDucked = false;
      this.applyVolumes();

      const barDuration = 3.2; // ~75 BPM chilled lounge bar tempo

      const playBar = () => {
        if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;
        if (this.ctx.state !== 'running') return;

        try {
          const t = this.ctx.currentTime;
          const chord = WINE_LOUNGE_CHORDS[this.currentBar % WINE_LOUNGE_CHORDS.length];
          this.currentBar++;

          // 1. Warm Acoustic Cellar Bass (root note on beat 1)
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();

          bassOsc.type = 'triangle';
          bassOsc.frequency.setValueAtTime(chord.bass, t);

          bassGain.gain.setValueAtTime(0.0001, t);
          bassGain.gain.linearRampToValueAtTime(0.42, t + 0.12);
          bassGain.gain.exponentialRampToValueAtTime(0.001, t + 3.1);

          bassOsc.connect(bassGain);
          bassGain.connect(this.musicGain);

          bassOsc.start(t);
          bassOsc.stop(t + 3.15);
          this.activeMusicOscs.push(bassOsc);

          // 2. Velvet Wine Pad Chords (4 voices with smooth 3.4s overlapping envelope)
          chord.pad.forEach((freq, idx) => {
            if (!this.ctx || !this.musicGain) return;
            const osc = this.ctx.createOscillator();
            const noteGain = this.ctx.createGain();

            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, t);

            noteGain.gain.setValueAtTime(0.0001, t);
            noteGain.gain.linearRampToValueAtTime(0.36, t + 0.45);
            noteGain.gain.exponentialRampToValueAtTime(0.001, t + 3.4);

            osc.connect(noteGain);
            noteGain.connect(this.musicGain);

            osc.start(t);
            osc.stop(t + 3.45);
            this.activeMusicOscs.push(osc);
          });

          // 3. Gentle Melodic Lounge Accent Chime (on beat 2.5 of the bar)
          const chimeTime = t + 1.2;
          const chimeOsc = this.ctx.createOscillator();
          const chimeGain = this.ctx.createGain();

          chimeOsc.type = 'sine';
          chimeOsc.frequency.setValueAtTime(chord.chime, chimeTime);

          chimeGain.gain.setValueAtTime(0.0001, chimeTime);
          chimeGain.gain.linearRampToValueAtTime(0.32, chimeTime + 0.01);
          chimeGain.gain.exponentialRampToValueAtTime(0.001, chimeTime + 1.8);

          chimeOsc.connect(chimeGain);
          chimeGain.connect(this.musicGain);

          chimeOsc.start(chimeTime);
          chimeOsc.stop(chimeTime + 1.85);
          this.activeMusicOscs.push(chimeOsc);

          // Cleanup stopped oscillators array periodically
          if (this.activeMusicOscs.length > 30) {
            this.activeMusicOscs = this.activeMusicOscs.slice(-15);
          }
        } catch {
          // Keep loop resilient
        }
      };

      // Play first bar immediately
      playBar();
      // Overlap slightly by 60ms to guarantee zero silence gaps across interval ticks
      this.musicTimer = window.setInterval(playBar, (barDuration * 1000) - 60);
    } catch {
      this.isMusicPlaying = false;
    }
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
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public resumeMusic() {
    if (!this.settings.muted) {
      this.startMusic();
    }
  }

  public stopMusic() {
    this.musicWanted = false;
    this.isMusicPlaying = false;

    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }

    this.activeMusicOscs.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Safe
      }
    });
    this.activeMusicOscs = [];
  }
}

export const soundManager = new SoundManager();
