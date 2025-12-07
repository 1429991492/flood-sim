import React from 'react';
import { SIMULATION_CONFIG } from '../constants';
import { FloodStatus } from '../types';

interface ControlPanelProps {
  waterLevel: number;
  setWaterLevel: (level: number) => void;
  isFlooding: boolean;
  toggleFlood: () => void;
  resetFlood: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  waterLevel,
  setWaterLevel,
  isFlooding,
  toggleFlood,
  resetFlood
}) => {
  // Determine danger status
  let status = FloodStatus.SAFE;
  let statusColor = 'text-green-500';
  let bgColor = 'bg-green-500/20 border-green-500/50';

  if (waterLevel > SIMULATION_CONFIG.RIVER_BED_HEIGHT + 2 && waterLevel < SIMULATION_CONFIG.TERRACE_HEIGHT) {
    status = FloodStatus.WARNING;
    statusColor = 'text-yellow-500';
    bgColor = 'bg-yellow-500/20 border-yellow-500/50';
  } else if (waterLevel >= SIMULATION_CONFIG.TERRACE_HEIGHT) {
    status = FloodStatus.CRITICAL;
    statusColor = 'text-red-500';
    bgColor = 'bg-red-500/20 border-red-500/50';
  }

  // Calculate percentage of houses flooded (visually approx)
  const isTerraceFlooded = waterLevel >= SIMULATION_CONFIG.TERRACE_HEIGHT;

  return (
    <div className="absolute top-4 left-4 z-10 w-80 md:w-96 p-6 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 shadow-xl text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          Valley Flood Sim
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Simulating river terrace inundation.
        </p>
      </div>

      {/* Status Card */}
      <div className={`mb-6 p-4 rounded-xl border ${bgColor} transition-colors duration-500`}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-200">Current Status</span>
          <span className={`font-bold ${statusColor}`}>{status}</span>
        </div>
        <div className="text-3xl font-mono font-bold">
          {waterLevel.toFixed(2)}m
        </div>
        <div className="text-xs text-slate-300 mt-1">
          River Level (Datum: Bed)
        </div>
      </div>

      {/* Info Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400">Terrace Height</div>
          <div className="font-semibold text-slate-200">{SIMULATION_CONFIG.TERRACE_HEIGHT}m</div>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400">Structure Risk</div>
          <div className={`font-semibold ${isTerraceFlooded ? 'text-red-400' : 'text-green-400'}`}>
            {isTerraceFlooded ? 'High Risk' : 'Low Risk'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <div>
          <label className="flex justify-between text-sm mb-2 text-slate-300">
            <span>Water Level Control</span>
            <span>{Math.round((waterLevel / SIMULATION_CONFIG.MAX_WATER_LEVEL) * 100)}%</span>
          </label>
          <input
            type="range"
            min={SIMULATION_CONFIG.MIN_WATER_LEVEL}
            max={SIMULATION_CONFIG.MAX_WATER_LEVEL}
            step={0.1}
            value={waterLevel}
            onChange={(e) => setWaterLevel(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={toggleFlood}
            className={`py-2 px-4 rounded-lg font-semibold transition-all shadow-lg active:scale-95 ${
              isFlooding 
                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
            }`}
          >
            {isFlooding ? 'Pause Flood' : 'Start Flood'}
          </button>
          
          <button
            onClick={resetFlood}
            className="py-2 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold transition-all active:scale-95"
          >
            Reset
          </button>
        </div>
      </div>
      
      <div className="mt-6 text-xs text-slate-500 border-t border-slate-700 pt-4">
        <p>Instructions:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Use slider or buttons to raise water.</li>
          <li>Observe when water breaches the terrace ({SIMULATION_CONFIG.TERRACE_HEIGHT}m).</li>
          <li>Drag to rotate, scroll to zoom.</li>
        </ul>
      </div>
    </div>
  );
};

export default ControlPanel;