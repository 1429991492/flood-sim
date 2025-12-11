
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
const ValleyScene = React.lazy(() => import('./components/ValleyScene'));
import ControlPanel from './components/ControlPanel';
import { SimStage } from './types';

const App: React.FC = () => {
  // --- Simulation Inputs ---
  const [rainfall, setRainfall] = useState<number>(250); // mm (default moderate rain)
  const [vegetationCoverage, setVegetationCoverage] = useState<number>(0.5); // 0 to 1
  const [drainageEnabled, setDrainageEnabled] = useState<boolean>(false);
  const [rainGardenEnabled, setRainGardenEnabled] = useState<boolean>(false);
  const [permeablePavingEnabled, setPermeablePavingEnabled] = useState<boolean>(false);
  
  // --- Simulation State ---
  const [waterLevel, setWaterLevel] = useState<number>(1.5); 
  const [simTime, setSimTime] = useState<number>(0); // In Hours
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simStage, setSimStage] = useState<SimStage>(SimStage.IDLE);
  const [hydroBefore, setHydroBefore] = useState({ peakRise: 0, drainRate: 0 });
  const [hydroAfter, setHydroAfter] = useState({ peakRise: 0, drainRate: 0 });
  const [curveBase, setCurveBase] = useState<Array<[number, number]>>([]);
  const [curveIntervention, setCurveIntervention] = useState<Array<[number, number]>>([]);

  const [showScene, setShowScene] = useState<boolean>(false);
  const workerRef = useRef<Worker | null>(null);

  // Refs for animation loop to access latest state without re-triggering effect constantly
  const stateRef = useRef({
    waterLevel: 1.5,
    simTime: 0,
    rainfall,
    vegetationCoverage,
    isSimulating,
    drainageEnabled,
    simStage,
    lastTime: performance.now()
  });

  // Sync refs
  useEffect(() => {
    stateRef.current = { 
      waterLevel, 
      simTime, 
      rainfall, 
      vegetationCoverage, 
      isSimulating,
      drainageEnabled,
      simStage,
      lastTime: stateRef.current.lastTime
    };
  }, [waterLevel, simTime, rainfall, vegetationCoverage, isSimulating, drainageEnabled, simStage]);

  useEffect(() => {
    const idle = (cb: () => void) => {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        // @ts-ignore
        window.requestIdleCallback(cb);
      } else {
        setTimeout(cb, 200);
      }
    };
    idle(() => setShowScene(true));
  }, []);

  // --- Physics Constants ---
  const BASE_LEVEL = 1.5;
  const SIM_SPEED = 8.0; // Hours per real-world second
  
  // Core Physics Loop
  useEffect(() => {
    let animationFrameId: number;

    const loop = (now: number) => {
      const prev = stateRef.current.lastTime;
      const dtMs = now - prev;
      stateRef.current.lastTime = now;
      const dtSeconds = Math.min(dtMs / 1000, 0.1);
      const dtHours = dtSeconds * SIM_SPEED;

      if (stateRef.current.isSimulating) {
        const { simTime, waterLevel, rainfall, vegetationCoverage, drainageEnabled, simStage } = stateRef.current;
        let newWaterLevel = waterLevel;
        let newSimTime = simTime;

        if (simStage === SimStage.RISING) {
          let runoffCoeff = 1.0 - (vegetationCoverage * 0.6);
          if (rainGardenEnabled) runoffCoeff *= 0.8; // 雨水花园减小径流
          const drainageMitigation = drainageEnabled ? 0.85 : 1.0;
          const pavingMitigation = permeablePavingEnabled ? 0.9 : 1.0; // 透水砖进一步缓和
          const rainIntensity = rainfall / 500;
          const maxPotentialRise = 14;
          const totalRise = rainIntensity * maxPotentialRise * runoffCoeff * drainageMitigation * pavingMitigation;
          const riseRate = totalRise / 24;

          const effectiveHours = Math.min(dtHours, Math.max(0, 24 - simTime));
          newWaterLevel += riseRate * effectiveHours;
          newSimTime = simTime + effectiveHours;

          if (newSimTime >= 24) {
            setIsSimulating(false);
            setSimStage(SimStage.PAUSED_PEAK);
            setSimTime(24);
            setWaterLevel(newWaterLevel);
          } else {
            setSimTime(newSimTime);
            setWaterLevel(newWaterLevel);
          }
        } else if (simStage === SimStage.RECEDING) {
          const baseDrain = 0.3;
          const vegBonus = vegetationCoverage * 0.8;
          const pipeBonus = drainageEnabled ? 2.5 : 0;
          const gardenBonus = rainGardenEnabled ? 0.6 : 0; // 花园促进回落
          const pavingBonus = permeablePavingEnabled ? 0.7 : 0; // 透水砖促进渗流
          const totalDrain = baseDrain + vegBonus + pipeBonus + gardenBonus + pavingBonus;

          newWaterLevel -= totalDrain * dtHours;
          if (newWaterLevel <= BASE_LEVEL) {
            newWaterLevel = BASE_LEVEL;
            setIsSimulating(false);
            setSimStage(SimStage.IDLE);
            setSimTime(0);
            setWaterLevel(newWaterLevel);
          } else {
            setWaterLevel(newWaterLevel);
          }
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    // @ts-ignore
    const w = new Worker(new URL('./workers/curveWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = w;
    w.onmessage = (ev: MessageEvent<{ base: Array<[number, number]>; intervention: Array<[number, number]> }>) => {
      setCurveBase(ev.data.base);
      setCurveIntervention(ev.data.intervention);
    };
    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  const startOrContinue = useCallback(() => {
    if (simStage === SimStage.IDLE) {
      setSimTime(0);
      setWaterLevel(BASE_LEVEL);
      setSimStage(SimStage.RISING);
      stateRef.current.lastTime = performance.now();
      setIsSimulating(true);
    } else if (simStage === SimStage.PAUSED_PEAK) {
      setSimStage(SimStage.RECEDING);
      stateRef.current.lastTime = performance.now();
      setIsSimulating(true);
    }
  }, [simStage]);

  const resetSimulation = useCallback(() => {
    setIsSimulating(false);
    setSimTime(0);
    setWaterLevel(BASE_LEVEL);
    setSimStage(SimStage.IDLE);
  }, []);

  const playClickSound = useCallback(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 120);
  }, []);

  const toggleRainGarden = useCallback(() => {
    playClickSound();
    setRainGardenEnabled((v) => {
      const nv = !v;
      return nv;
    });
  }, [playClickSound]);

  const togglePermeablePaving = useCallback(() => {
    playClickSound();
    setPermeablePavingEnabled((v) => {
      const nv = !v;
      return nv;
    });
  }, [playClickSound]);

  useEffect(() => {
    const baseRunoffCoeff = 1.0 - (vegetationCoverage * 0.6);
    const basePeakRise = (rainfall / 500) * 14 * baseRunoffCoeff * 1.0; // 改造前不含排水系统
    const baseDrainRate = 0.3 + vegetationCoverage * 0.8; // 改造前不含排水系统
    setHydroBefore({ peakRise: basePeakRise, drainRate: baseDrainRate });

    let afterCoeff = baseRunoffCoeff * (rainGardenEnabled ? 0.8 : 1.0) * (permeablePavingEnabled ? 0.9 : 1.0);
    const afterPeakRise = (rainfall / 500) * 14 * afterCoeff * (drainageEnabled ? 0.85 : 1.0);
    const afterDrainRate = (0.3 + vegetationCoverage * 0.8 + (drainageEnabled ? 2.5 : 0)) + (rainGardenEnabled ? 0.6 : 0) + (permeablePavingEnabled ? 0.7 : 0);
    setHydroAfter({ peakRise: afterPeakRise, drainRate: afterDrainRate });
    if (workerRef.current) {
      workerRef.current.postMessage({
        rainfall,
        vegetationCoverage,
        drainageEnabled,
        rainGardenEnabled,
        permeablePavingEnabled,
        baseLevel: BASE_LEVEL
      });
    }
  }, [rainfall, vegetationCoverage, drainageEnabled, rainGardenEnabled, permeablePavingEnabled]);

  return (
    <div className="relative w-screen h-screen bg-slate-900 overflow-hidden">
      <div className="absolute inset-0">
        {showScene ? (
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-slate-300">加载场景中...</div>}>
            <ValleyScene 
              waterLevel={waterLevel} 
              vegetationCoverage={vegetationCoverage}
              isRaining={isSimulating && simTime <= 24}
              drainageEnabled={drainageEnabled}
              showPeakIndicator={simStage === SimStage.PAUSED_PEAK}
              rainGardenEnabled={rainGardenEnabled}
              permeablePavingEnabled={permeablePavingEnabled}
            />
          </Suspense>
        ) : null}
      </div>

      <ControlPanel 
        rainfall={rainfall}
        setRainfall={setRainfall}
        vegetationCoverage={vegetationCoverage}
        setVegetationCoverage={setVegetationCoverage}
        drainageEnabled={drainageEnabled}
        setDrainageEnabled={setDrainageEnabled}
        waterLevel={waterLevel}
        simTime={simTime}
        isSimulating={isSimulating}
        simStage={simStage}
        startOrContinue={startOrContinue}
        reset={resetSimulation}
        rainGardenEnabled={rainGardenEnabled}
        toggleRainGarden={toggleRainGarden}
        permeablePavingEnabled={permeablePavingEnabled}
        togglePermeablePaving={togglePermeablePaving}
        hydroBefore={hydroBefore}
        hydroAfter={hydroAfter}
        curveBase={curveBase}
        curveIntervention={curveIntervention}
      />
    </div>
  );
};

export default App;
 
