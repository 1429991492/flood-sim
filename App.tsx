import React, { useState, useEffect, useCallback } from 'react';
import ValleyScene from './components/ValleyScene';
import ControlPanel from './components/ControlPanel';
import { SIMULATION_CONFIG } from './constants';

const App: React.FC = () => {
  // Simulation Inputs
  const [rainfall, setRainfall] = useState<number>(0); // mm
  const [vegetationCoverage, setVegetationCoverage] = useState<number>(0.5); // 0 to 1
  
  // Simulation Output
  const [waterLevel, setWaterLevel] = useState<number>(1.5); 
  const [isRaining, setIsRaining] = useState<boolean>(false);

  // Core Simulation Physics Loop
  useEffect(() => {
    let animationFrameId: number;

    const simulate = () => {
      // 1. Calculate Target Water Level based on Rainfall
      // Logic: 
      // - Base level is 1.5m
      // - Rainfall adds height.
      // - Vegetation reduces the impact (absorbs water/slows runoff).
      
      const baseLevel = 1.5;
      
      // Vegetation factor: 0% veg = 1.0 runoff (bad), 100% veg = 0.6 runoff (good absorption)
      const runoffCoefficient = 1.0 - (vegetationCoverage * 0.4);
      
      // Scale: 500mm rain -> approx +10m water height at worst case
      const rainImpact = (rainfall / 50) * runoffCoefficient; 
      
      const targetLevel = baseLevel + rainImpact;

      // 2. Smoothly animate water level towards target
      setWaterLevel((prev) => {
        const diff = targetLevel - prev;
        
        // If difference is small, snap to target
        if (Math.abs(diff) < 0.01) return targetLevel;
        
        // Rise faster if it's raining hard, recede slower
        const speed = isRaining ? 0.05 : 0.02;
        return prev + diff * speed;
      });

      animationFrameId = requestAnimationFrame(simulate);
    };

    animationFrameId = requestAnimationFrame(simulate);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [rainfall, vegetationCoverage, isRaining]);

  const resetSimulation = useCallback(() => {
    setRainfall(0);
    setVegetationCoverage(0.5);
    setIsRaining(false);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-slate-900 overflow-hidden">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0">
        <ValleyScene 
          waterLevel={waterLevel} 
          vegetationCoverage={vegetationCoverage}
          isRaining={isRaining}
        />
      </div>

      {/* UI Overlay Layer */}
      <ControlPanel 
        rainfall={rainfall}
        setRainfall={setRainfall}
        vegetationCoverage={vegetationCoverage}
        setVegetationCoverage={setVegetationCoverage}
        waterLevel={waterLevel}
        isRaining={isRaining}
        setIsRaining={setIsRaining}
        reset={resetSimulation}
      />
    </div>
  );
};

export default App;