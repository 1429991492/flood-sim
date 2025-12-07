export interface SimulationState {
  waterLevel: number;
  isFlooding: boolean;
  floodSpeed: number;
}

export interface HouseData {
  id: number;
  x: number;
  z: number;
  y: number; // Base elevation
  rotation: number;
}

export enum FloodStatus {
  SAFE = 'SAFE',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  SUBMERGED = 'SUBMERGED'
}
