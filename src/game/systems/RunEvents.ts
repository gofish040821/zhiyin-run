export type RunState = 'title' | 'playing' | 'paused' | 'dying' | 'gameover';

export type RunData = {
  state: RunState;
  distance: number;
  score: number;
  best: number;
  combo: number;
  power: string;
  powerRemaining: number;
};

type Listener = (data: RunData) => void;

class RunEvents {
  private listeners = new Set<Listener>();
  on(listener: Listener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit(data: RunData): void { this.listeners.forEach((listener) => listener(data)); }
}

export const runEvents = new RunEvents();
