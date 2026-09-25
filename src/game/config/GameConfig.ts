export const GameConfig = {
  width: 960,
  height: 540,
  groundY: 432,
  playerX: 180,
  gravity: 1750,
  jumpVelocity: -675,
  baseSpeed: 275,
  maxSpeed: 570,
  speedGainPerMeter: 0.075,
  obstacleGapSeconds: { min: 1.35, max: 2.05 },
  obstacleGapReduction: 0.00013,
  distanceDivisor: 12,
  cornValue: 30,
  perfectValue: 20,
  perfectWindow: 20,
  comboTimeout: 5,
  scoreMultiplierPerCombo: 0.2,
  powerDuration: 2.5,
  allRoundDuration: 5,
  masterVolume: 0.36,
  obstacleWeights: {
    crate: 4, rail: 3, rock: 4, hay: 3,
    basketball: 3, bird: 3, speaker: 2, barricade: 3
  }
} as const;

export type ObstacleKind = keyof typeof GameConfig.obstacleWeights;
