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
  SAFE = '安全',
  WARNING = '警告',
  CRITICAL = '危险',
  SUBMERGED = '已淹没'
}

export enum SimStage {
  IDLE = 'idle',
  RISING = 'rising',
  PAUSED_PEAK = 'paused_at_peak',
  RECEDING = 'receding'
}

export interface OperationRecord {
  id: string;
  type: '建设雨水花园' | '铺设透水砖' | '撤销' | '重做';
  timestamp: number;
  description: string;
}
