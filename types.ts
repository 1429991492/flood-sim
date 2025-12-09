export interface SimulationState {
  waterLevel: number;
  rainfall: number; // in mm
  vegetationCoverage: number; // 0 to 1
  isRaining: boolean;
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