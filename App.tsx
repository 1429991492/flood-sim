
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ValleyScene from './components/ValleyScene';
import ControlPanel from './components/ControlPanel';

const App: React.FC = () => {
  // --- Simulation Inputs ---
  const [rainfall, setRainfall] = useState<number>(250); // mm (default moderate rain)
  const [vegetationCoverage, setVegetationCoverage] = useState<number>(0.5); // 0 to 1
  
  // --- Simulation State ---
  const [waterLevel, setWaterLevel] = useState<number>(1.5); 
  const [simTime, setSimTime] = useState<number>(0); // In Hours
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Refs for animation loop to access latest state without re-triggering effect constantly
  const stateRef = useRef({
    waterLevel: 1.5,
    simTime: 0,
    rainfall,
    vegetationCoverage,
    isSimulating
  });

  // Sync refs
  useEffect(() => {
    stateRef.current = { waterLevel, simTime, rainfall, vegetationCoverage, isSimulating };
  }, [waterLevel, simTime, rainfall, vegetationCoverage, isSimulating]);

  // --- Physics Constants ---
  const BASE_LEVEL = 1.5;
  const SIM_SPEED = 8.0; // Hours per real-world second
  
  // Core Physics Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dtMs = now - lastTime;
      lastTime = now;
      const dtSeconds = Math.min(dtMs / 1000, 0.1); // Cap dt to avoid jumps
      const dtHours = dtSeconds * SIM_SPEED;

      if (stateRef.current.isSimulating) {
        const { simTime, waterLevel, rainfall, vegetationCoverage } = stateRef.current;
        
        let newWaterLevel = waterLevel;
        const newSimTime = simTime + dtHours;

        // --- Phase 1: Raining (0 - 24 Hours) ---
        if (simTime < 24) {
          // Calculate Target Peak Rise
          // Formula: 500mm rain -> ~12m rise if 0 vegetation.
          // Vegetation reduces the runoff coefficient.
          // 0% Veg -> 100% Runoff impact
          // 100% Veg -> 40% Runoff impact (60% absorption/mitigation)
          const runoffCoeff = 1.0 - (vegetationCoverage * 0.6);
          const rainIntensity = rainfall / 500; // 0 to 1 scale
          
          const maxPotentialRise = 14; // Meters
          const totalRise = rainIntensity * maxPotentialRise * runoffCoeff;
          
          // Rate of rise (meters per hour)
          const riseRate = totalRise / 24; 
          
          newWaterLevel += riseRate * dtHours;
        } 
        // --- Phase 2: Receding (> 24 Hours) ---
        else {
          // Drainage Speed
          // Base drainage + Bonus from Vegetation (roots help infiltration)
          const baseDrain = 0.3; // m/h
          const vegBonus = vegetationCoverage * 0.8; // High veg drains faster
          const totalDrain = baseDrain + vegBonus;
          
          newWaterLevel -= totalDrain * dtHours;
          
          // Clamp to base level
          if (newWaterLevel < BASE_LEVEL) {
             newWaterLevel = BASE_LEVEL;
             // Stop simulation if we are back to normal
             setIsSimulating(false);
          }
        }

        setSimTime(newSimTime);
        setWaterLevel(newWaterLevel);
      }
      
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []); // Empty dependency array, relies on refs

  const startSimulation = useCallback(() => {
    setSimTime(0);
    setWaterLevel(BASE_LEVEL);
    setIsSimulating(true);
  }, []);

  const resetSimulation = useCallback(() => {
    setIsSimulating(false);
    setSimTime(0);
    setWaterLevel(BASE_LEVEL);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-slate-900 overflow-hidden">
      <div className="absolute inset-0">
        <ValleyScene 
          waterLevel={waterLevel} 
          vegetationCoverage={vegetationCoverage}
          isRaining={isSimulating && simTime <= 24}
        />
      </div>

      <ControlPanel 
        rainfall={rainfall}
        setRainfall={setRainfall}
        vegetationCoverage={vegetationCoverage}
        setVegetationCoverage={setVegetationCoverage}
        waterLevel={waterLevel}
        simTime={simTime}
        isSimulating={isSimulating}
        startSimulation={startSimulation}
        reset={resetSimulation}
      />
    </div>
  );
};

export default App;
