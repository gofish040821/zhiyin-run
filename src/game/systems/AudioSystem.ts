import { GameConfig } from '../config/GameConfig';

type Note = { frequency: number; duration: number; offset?: number; wave?: OscillatorType; gain?: number };

export class AudioSystem {
  private context?: AudioContext;
  muted = false;

  private getContext(): AudioContext | undefined {
    if (this.muted) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume();
      return this.context;
    } catch { return; }
  }

  private notes(sequence: Note[]): void {
    const ctx = this.getContext();
    if (!ctx) return;
    for (const note of sequence) {
      const oscillator = ctx.createOscillator();
      const volume = ctx.createGain();
      const start = ctx.currentTime + (note.offset ?? 0);
      oscillator.type = note.wave ?? 'square';
      oscillator.frequency.setValueAtTime(note.frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, note.frequency * 0.72), start + note.duration);
      volume.gain.setValueAtTime(0.0001, start);
      volume.gain.exponentialRampToValueAtTime((note.gain ?? 0.16) * GameConfig.masterVolume, start + 0.008);
      volume.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
      oscillator.connect(volume).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + note.duration + 0.015);
    }
  }

  jump(): void { this.notes([{ frequency: 440, duration: 0.15 }, { frequency: 690, duration: 0.12, offset: 0.07 }]); }
  land(): void { this.notes([{ frequency: 155, duration: 0.07, wave: 'triangle', gain: 0.13 }]); }
  corn(): void { this.notes([{ frequency: 780, duration: 0.1 }, { frequency: 1180, duration: 0.16, offset: 0.07 }]); }
  combo(level: number): void { this.notes([{ frequency: 500 + level * 65, duration: 0.12 }, { frequency: 760 + level * 80, duration: 0.18, offset: 0.1 }]); }
  basketball(): void { this.notes([{ frequency: 180, duration: 0.12, wave: 'sine', gain: 0.26 }]); }
  power(): void { this.notes([0, 1, 2, 3].map((i) => ({ frequency: 440 * Math.pow(2, i / 6), duration: 0.18, offset: i * 0.08 }))); }
  hit(): void { this.notes([{ frequency: 195, duration: 0.35, wave: 'sawtooth', gain: 0.28 }, { frequency: 90, duration: 0.35, offset: 0.15, wave: 'triangle' }]); }
  gameOver(): void { this.notes([440, 370, 280, 180].map((f, i) => ({ frequency: f, duration: 0.18, offset: i * 0.16, wave: 'triangle' }))); }
  toggle(): boolean { this.muted = !this.muted; return this.muted; }
}

export const audio = new AudioSystem();
