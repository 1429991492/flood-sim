
export const SIMULATION_CONFIG = {
  MIN_WATER_LEVEL: 0,
  MAX_WATER_LEVEL: 15,
  TERRACE_HEIGHT: 5,
  RIVER_BED_HEIGHT: 0,
  FLOOD_SPEED_MULTIPLIER: 0.05,
  MAX_RAINFALL: 500, // mm
  MAX_VEGETATION_COUNT: 300,
};

export const COLORS = {
  WATER: '#3b82f6',
  WATER_SURFACE: '#60a5fa',
  GRASS_LOW: '#4ade80',
  GRASS_HIGH: '#15803d',
  TERRACE_DIRT: '#a8a29e',
  HOUSE_WALL: '#e2e8f0',
  HOUSE_ROOF: '#ef4444',
  HOUSE_ROOF_WET: '#475569',
  SOIL: '#574638',
  CROP_1: '#facc15',
  CROP_2: '#84cc16',
  POLE: '#78350f',
  ROCK: '#57534e',
  // Updated natural greens for trees
  TREE_LIGHT: '#22c55e', // Green 500
  TREE_DARK: '#15803d',  // Green 700
  RAIN: '#cbd5e1',
};

export const HOUSE_POSITIONS = [
  { id: 1, x: 8, z: -5, y: SIMULATION_CONFIG.TERRACE_HEIGHT, rotation: 0.1 },
  { id: 2, x: 9, z: -1, y: SIMULATION_CONFIG.TERRACE_HEIGHT, rotation: -0.2 },
  { id: 3, x: 7.5, z: 3, y: SIMULATION_CONFIG.TERRACE_HEIGHT, rotation: 0.3 },
  { id: 4, x: 10, z: 6, y: SIMULATION_CONFIG.TERRACE_HEIGHT, rotation: 0 },
  { id: 5, x: 8.5, z: -9, y: SIMULATION_CONFIG.TERRACE_HEIGHT, rotation: -0.1 },
];
