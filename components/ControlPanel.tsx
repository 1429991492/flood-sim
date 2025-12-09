import React from 'react';
import { SIMULATION_CONFIG } from '../constants';
import { FloodStatus } from '../types';

interface ControlPanelProps {
  rainfall: number;
  setRainfall: (val: number) => void;
  vegetationCoverage: number;
  setVegetationCoverage: (val: number) => void;
  waterLevel: number;
  isRaining: boolean;
  setIsRaining: (val: boolean) => void;
  reset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  rainfall,
  setRainfall,
  vegetationCoverage,
  setVegetationCoverage,
  waterLevel,
  isRaining,
  setIsRaining,
  reset
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

  const isTerraceFlooded = waterLevel >= SIMULATION_CONFIG.TERRACE_HEIGHT;

  return (
    <div className="absolute top-4 left-4 z-10 w-80 md:w-96 p-6 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 shadow-xl text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          Valley Flood Sim
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Simulate flood impact based on rainfall & land cover.
        </p>
      </div>

      {/* Status Card */}
      <div className={`mb-6 p-4 rounded-xl border ${bgColor} transition-colors duration-500`}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-200">Current Status</span>
          <span className={`font-bold ${statusColor}`}>{status}</span>
        </div>
        <div className="flex items-end gap-2">
            <div className="text-3xl font-mono font-bold">
            {waterLevel.toFixed(2)}m
            </div>
            <div className="text-sm text-slate-300 mb-1.5">Water Level</div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-6">
        
        {/* Rainfall Control */}
        <div>
          <label className="flex justify-between text-sm mb-2 text-slate-300">
            <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                </svg>
                24h Rainfall
            </span>
            <span className="font-mono">{rainfall} mm</span>
          </label>
          <input
            type="range"
            min={0}
            max={SIMULATION_CONFIG.MAX_RAINFALL}
            step={10}
            value={rainfall}
            onChange={(e) => setRainfall(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Dry</span>
            <span>Extreme</span>
          </div>
        </div>

        {/* Vegetation Control */}
        <div>
          <label className="flex justify-between text-sm mb-2 text-slate-300">
            <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.279 1.625l.59.394-.61.502.903.604a1.875 1.875 0 01.996 1.564v.308a1.5 1.5 0 01-1.5 1.5h-.065c-.886 0-1.747.24-2.522.686-2.073 1.192-3.805-2.068-1.503-4.108 1.487-1.32-.47-2.618-1.705-1.284a1.875 1.875 0 00-.776 1.408v.283c0 .825-.668 1.5-1.5 1.5h-.26c-.72 0-1.428-.15-2.083-.434-1.29-.558-1.636-2.222-.888-3.375 1.096-1.687.126-3.858-1.65-3.858H2.602c-.864 0-1.442-1.004-.888-1.716C2.334 3.65 3.086 2.25 4.885 2.25h12.441l.424-.001z" />
                </svg>
                Vegetation Coverage
            </span>
            <span className="font-mono">{Math.round(vegetationCoverage * 100)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={vegetationCoverage}
            onChange={(e) => setVegetationCoverage(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500 hover:accent-green-400 transition-all"
          />
          <div className="text-xs text-slate-500 mt-1">
             Higher vegetation absorbs water, reducing flood height.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsRaining(!isRaining)}
            className={`py-3 px-4 rounded-lg font-semibold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
              isRaining 
                ? 'bg-slate-600 text-white' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
            }`}
          >
            {isRaining ? 'Pause Rain' : 'Start Simulation'}
          </button>
          
          <button
            onClick={reset}
            className="py-3 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold transition-all active:scale-95"
          >
            Reset
          </button>
        </div>
      </div>
      
    </div>
  );
};

export default ControlPanel;