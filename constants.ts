

export const SIMULATION_CONFIG = {
  MIN_WATER_LEVEL: 0,
  MAX_WATER_LEVEL: 15, // Increased slightly to accommodate heavy rain scenarios
  TERRACE_HEIGHT: 5,
  RIVER_BED_HEIGHT: 0,
  FLOOD_SPEED_MULTIPLIER: 0.05,
  MAX_RAINFALL: 500, // mm
  MAX_VEGETATION_COUNT: 400,
};

export const COLORS = {
  WATER: '#3b82f6',
  WATER_SURFACE: '#60a5fa',
  GRASS_LOW: '#4ade80',
  GRASS_HIGH: '#15803d',
  TERRACE_DIRT: '#a8a29e',
  HOUSE_WALL: '#e2e8f0',
  HOUSE_ROOF: '#ef4444',
  HOUSE_ROOF_WET: '#475569', // Dark grey/slate for damaged roof
  SOIL: '#574638', // Dark brown for the side of the terrain
  CROP_1: '#facc15', // Wheat
  CROP_2: '#84cc16', // Light green crops
  POLE: '#78350f', // Wood
  ROCK: '#57534e', // Stone grey
  TREE_LIGHT: '#4d7c0f', // Lime 700
  TREE_DARK: '#14532d', // Green 900
  RAIN: '#cbd5e1', // Slate 300 (light grey/white)
};

// Procedural generation of house positions on the terrace
export const HOUSE_POSITIONS = [
  { id: 1, x: 8, z: -5, y: SIMULATION_CONFIG.TERRACE_HEIGHT, rotation: 0.1 },
  { id: 2, x: 9, z: -1, y: SIMULATION_CONFIG.TERRACE_HEIGHT, rotation: -0.2 },
  { id: 3, x: 7.5, z: 3, y: SIMULATION_CONFIG.TERRACE_HEIGHT, rotation: 0.3 },
  { id: 4, x: 10, z: 6, y: SIMULATION_CONFIG.TERRACE_HEIGHT, rotation: 0 },
  { id: 5, x: 8.5, z: -9, y: SIMULATION_CONFIG.TERRACE_HEIGHT, rotation: -0.1 },
];