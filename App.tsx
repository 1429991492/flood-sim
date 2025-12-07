import React, { useState, useEffect, useCallback } from 'react';
import ValleyScene from './components/ValleyScene';
import ControlPanel from './components/ControlPanel';
import { SIMULATION_CONFIG } from './constants';

const App: React.FC = () => {
  const [waterLevel, setWaterLevel] = useState<number>(1.5); // Initial low water level
  const [isFlooding, setIsFlooding] = useState<boolean>(false);

  // Simulation Loop
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      if (isFlooding) {
        setWaterLevel((prev) => {
          const nextLevel = prev + SIMULATION_CONFIG.FLOOD_SPEED_MULTIPLIER;
          if (nextLevel >= SIMULATION_CONFIG.MAX_WATER_LEVEL) {
            setIsFlooding(false); // Stop when max reached
            return SIMULATION_CONFIG.MAX_WATER_LEVEL;
          }
          return nextLevel;
        });
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    if (isFlooding) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isFlooding]);

  const toggleFlood = useCallback(() => {
    setIsFlooding((prev) => !prev);
  }, []);

  const resetFlood = useCallback(() => {
    setIsFlooding(false);
    setWaterLevel(1.5);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-slate-900 overflow-hidden">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0">
        <ValleyScene waterLevel={waterLevel} />
      </div>

      {/* UI Overlay Layer */}
      <ControlPanel 
        waterLevel={waterLevel}
        setWaterLevel={(val) => {
          setIsFlooding(false); // Stop auto-flooding if user interacts manually
          setWaterLevel(val);
        }}
        isFlooding={isFlooding}
        toggleFlood={toggleFlood}
        resetFlood={resetFlood}
      />
    </div>
  );
};

export default App;
