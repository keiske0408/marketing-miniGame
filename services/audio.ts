import type { UserSettings } from '../types';

class SoundManager {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private isMusicPlaying = false;

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

  public updateSettings(newSettings: UserSettings) {
    this.settings = newSettings;
    if (this.musicGain && this.ctx) {
      const vol = this.getMusicVolume();
      this.musicGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    }
    if (this.settings.muted) {
      this.stopMusic();
    }
  }

  public async unlock(): Promise<boolean> {
    if (this.isUnlocked && this.ctx?.state === 'running') return true;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this.isUnlocked = true;
      return true;
    } catch {
      return false;
    }
  }

  private getEffectiveVolume(category: 'sfx' | 'music'): number {
    if (this.settings.muted) return 0;
    const master = this.settings.masterVolume / 100;
    const cat = category === 'sfx' ? this.settings.sfxVolume / 100 : this.settings.musicVolume / 100;
    return Math.max(0, Math.min(1, master * cat));
  }

  private getMusicVolume(): number {
    return this.getEffectiveVolume('music') * 0.12; // background ambient level
  }

  // --- Sound Effects using Web Audio API synthesis ---

  public playClick() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0 || !this.ctx || !this.isUnlocked) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);

      gain.gain.setValueAtTime(vol * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.04);
    } catch {
      // Audio playback silently ignored if context suspended
    }
  }

  public playSuccess() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0 || !this.ctx || !this.isUnlocked) return;

    try {
      const t = this.ctx.currentTime;
      // Cheerful ascending arpeggio (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteStart = t + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(vol * 0.35, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.16);
      });
    } catch {
      // AudioContext state guard
    }
  }

  public playFail() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0 || !this.ctx || !this.isUnlocked) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.18);

      gain.gain.setValueAtTime(vol * 0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.18);
    } catch {
      // Audio context guard
    }
  }

  public playCountdown(isGo: boolean = false) {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0 || !this.ctx || !this.isUnlocked) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sine';
      const freq = isGo ? 1200 : 720;
      const duration = isGo ? 0.3 : 0.12;

      osc.frequency.setValueAtTime(freq, t);
      if (isGo) {
        osc.frequency.exponentialRampToValueAtTime(1600, t + duration);
      }

      gain.gain.setValueAtTime(vol * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + duration);
    } catch {
      // Context guard
    }
  }

  public playLevelUp() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0 || !this.ctx || !this.isUnlocked) return;

    try {
      const t = this.ctx.currentTime;
      // Triumphant Fanfare (F4, A4, C5, F5, A5)
      const notes = [349.23, 440.0, 523.25, 698.46, 880.0];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteStart = t + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(vol * 0.38, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.35);
      });
    } catch {
      // Context guard
    }
  }

  // --- Ambient Background Music Generator ---

  public startMusic() {
    if (this.isMusicPlaying || this.settings.muted) return;
    const vol = this.getMusicVolume();
    if (vol <= 0 || !this.ctx || !this.isUnlocked) return;

    try {
      this.isMusicPlaying = true;
      const chords = [
        [261.63, 329.63], // C4 + E4
        [293.66, 369.99], // D4 + F#4
        [220.0, 329.63],  // A3 + E4
        [246.94, 392.0],  // B3 + G4
      ];
      let step = 0;

      const playStep = () => {
        if (!this.isMusicPlaying || !this.ctx) return;
        try {
          const t = this.ctx.currentTime;
          const [f1, f2] = chords[step % chords.length];
          step++;

          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(f1, t);
          osc2.frequency.setValueAtTime(f2, t);

          gain.gain.setValueAtTime(0.001, t);
          gain.gain.linearRampToValueAtTime(this.getMusicVolume(), t + 0.4);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 2.4);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.ctx.destination);

          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 2.5);
          osc2.stop(t + 2.5);
        } catch {
          // Keep loop resilient
        }
      };

      playStep();
      this.musicTimer = window.setInterval(playStep, 2500);
    } catch {
      this.isMusicPlaying = false;
    }
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicGain && this.ctx) {
      try {
        this.musicGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      } catch {
        // Safe unmount
      }
    }
  }
}

export const soundManager = new SoundManager();
