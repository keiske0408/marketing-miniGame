import type { Difficulty } from './types';

export interface LevelConfig {
  level: number;
  speed: number;     // board-widths per second
  pieceW: number;    // fraction of board width
  pieceH: number;    // fraction of board height
  tolerance: number; // allowed offset, fraction of board width
  goal: number;      // matches needed to clear the level
  time: number;      // seconds
}

export function getLevel(level: number, difficulty: Difficulty = 'normal'): LevelConfig {
  const step = level - 1;
  const pieceW = Math.max(0.09, 0.26 - step * 0.02);

  let speedMult = 1.0;
  let toleranceMult = 1.0;
  let timeDelta = 0;

  if (difficulty === 'chill') {
    speedMult = 0.75;
    toleranceMult = 1.35;
    timeDelta = 8;
  } else if (difficulty === 'hard') {
    speedMult = 1.22;
    toleranceMult = 0.8;
    timeDelta = -5;
  }

  return {
    level,
    speed: Math.min(1.6, (0.4 + step * 0.09) * speedMult),
    pieceW,
    pieceH: Math.min(0.5, pieceW * 1.5),
    tolerance: pieceW * 0.22 * toleranceMult,
    goal: 3,
    time: Math.max(20, 40 - step * 2 + timeDelta),
  };
}

export const randomTarget = (w: number, h: number) => ({
  x: 0.12 + Math.random() * (1 - w - 0.24),
  y: 0.08 + Math.random() * (1 - h - 0.16),
});
