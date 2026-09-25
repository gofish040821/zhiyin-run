const KEY = 'zhiyin-run-best-v1';

export function getBest(): number {
  try { return Math.max(0, Number(localStorage.getItem(KEY)) || 0); } catch { return 0; }
}

export function setBest(distance: number): number {
  const best = Math.max(getBest(), Math.floor(distance));
  try { localStorage.setItem(KEY, String(best)); } catch { /* private mode */ }
  return best;
}
