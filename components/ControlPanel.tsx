
import React from 'react';
import { SIMULATION_CONFIG } from '../constants';
import { FloodStatus, SimStage } from '../types';

interface ControlPanelProps {
  rainfall: number;
  setRainfall: (val: number) => void;
  vegetationCoverage: number;
  setVegetationCoverage: (val: number) => void;
  drainageEnabled: boolean;
  setDrainageEnabled: (val: boolean) => void;
  waterLevel: number;
  simTime: number;
  isSimulating: boolean;
  simStage: SimStage;
  startOrContinue: () => void;
  reset: () => void;
  rainGardenEnabled: boolean;
  toggleRainGarden: () => void;
  permeablePavingEnabled: boolean;
  togglePermeablePaving: () => void;
  hydroBefore: { peakRise: number; drainRate: number };
  hydroAfter: { peakRise: number; drainRate: number };
  curveBase: Array<[number, number]>;
  curveIntervention: Array<[number, number]>;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  rainfall,
  setRainfall,
  vegetationCoverage,
  setVegetationCoverage,
  drainageEnabled,
  setDrainageEnabled,
  waterLevel,
  simTime,
  isSimulating,
  simStage,
  startOrContinue,
  reset,
  rainGardenEnabled,
  toggleRainGarden,
  permeablePavingEnabled,
  togglePermeablePaving,
  hydroBefore,
  hydroAfter,
  curveBase,
  curveIntervention
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

  const isRaining = isSimulating && simTime <= 24;

  return (
    <div className="absolute top-4 left-4 z-10 w-80 md:w-96 p-6 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 shadow-xl text-white max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          河谷洪水演练
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          模拟24小时降雨过程，观察水位变化及排水情况。
        </p>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Status Card */}
        <div className={`col-span-2 p-3 rounded-xl border ${bgColor} transition-colors duration-500 flex justify-between items-center`}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-200 opacity-80">当前水位</div>
            <div className="text-2xl font-mono font-bold mt-1">{waterLevel.toFixed(2)}m</div>
          </div>
          <div className="text-right">
             <span className={`font-bold ${statusColor} px-2 py-1 rounded bg-black/20`}>{status}</span>
          </div>
        </div>
        {simStage === SimStage.PAUSED_PEAK && (
          <div className="col-span-2 text-xs text-blue-300 bg-blue-900/30 border border-blue-700/50 rounded-lg px-3 py-2">
            最高水位 {waterLevel.toFixed(2)}m，点击“继续回落”以回归初始水位。
          </div>
        )}

        {/* Time Card */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
           <div className="text-xs text-slate-400 uppercase">模拟时间</div>
           <div className="text-xl font-mono font-bold mt-1 text-blue-200">
             {Math.floor(simTime)}h
           </div>
        </div>
        
        {/* Weather Card */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center gap-2">
           {isRaining ? (
             <>
               <span className="animate-pulse text-blue-400">🌧️</span>
               <span className="font-semibold text-blue-100">降雨中</span>
             </>
           ) : (
             <>
               <span className="text-yellow-400">☁️</span>
               <span className="font-semibold text-slate-300">多云/阴</span>
             </>
           )}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-6">
        
        {/* Rainfall Control */}
        <div className={isSimulating ? 'opacity-50 pointer-events-none' : ''}>
          <label className="flex justify-between text-sm mb-2 text-slate-300">
            <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                </svg>
                24小时降雨量
            </span>
            <span className="font-mono text-blue-300">{rainfall} mm</span>
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
            <span>小雨</span>
            <span>特大暴雨</span>
          </div>
        </div>

        {/* Vegetation Control */}
        <div className={isSimulating ? 'opacity-50 pointer-events-none' : ''}>
          <label className="flex justify-between text-sm mb-2 text-slate-300">
            <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.279 1.625l.59.394-.61.502.903.604a1.875 1.875 0 01.996 1.564v.308a1.5 1.5 0 01-1.5 1.5h-.065c-.886 0-1.747.24-2.522.686-2.073 1.192-3.805-2.068-1.503-4.108 1.487-1.32-.47-2.618-1.705-1.284a1.875 1.875 0 00-.776 1.408v.283c0 .825-.668 1.5-1.5 1.5h-.26c-.72 0-1.428-.15-2.083-.434-1.29-.558-1.636-2.222-.888-3.375 1.096-1.687.126-3.858-1.65-3.858H2.602c-.864 0-1.442-1.004-.888-1.716C2.334 3.65 3.086 2.25 4.885 2.25h12.441l.424-.001z" />
                </svg>
                植被覆盖率
            </span>
            <span className="font-mono text-green-300">{Math.round(vegetationCoverage * 100)}%</span>
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
        </div>

        {/* 操作区域：三项改造开关 + 开始按钮统一布局 */}
        <div className="space-y-3">
          {/* 加强排水系统 */}
          <div className={isSimulating ? 'opacity-50 pointer-events-none' : ''}>
            <label className="flex items-center justify之间 text-sm mb-2 text-slate-300 cursor-pointer group">
               <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" />
                  </svg>
                  加强排水系统
               </span>
               <div 
                 onClick={() => setDrainageEnabled(!drainageEnabled)}
                 className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${drainageEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}
               >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${drainageEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
               </div>
            </label>
            <div className="text-xs text-slate-500 mt-1">
               {drainageEnabled ? '已开启：阶地已铺设管网，雨停后水位将快速下降。' : '未开启：依靠自然渗透和地形排水。'}
            </div>
          </div>

          {/* 建设雨水花园 */}
          <div className={isSimulating ? 'opacity-50 pointer-events-none' : ''}>
            <label className="flex items-center justify-between text-sm mb-2 text-slate-300 cursor-pointer group">
               <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                  </svg>
                  建设雨水花园
               </span>
               <div 
                 onClick={toggleRainGarden}
                 className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${rainGardenEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}
               >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${rainGardenEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
               </div>
            </label>
            <div className="text-xs text-slate-500 mt-1">
               {rainGardenEnabled ? '已开启：阶地设置3x3米雨水花园，峰值降低、回落加速。' : '未开启：无花园增益。'}
            </div>
          </div>

          {/* 铺设透水砖 */}
          <div className={isSimulating ? 'opacity-50 pointer-events-none' : ''}>
            <label className="flex items-center justify-between text-sm mb-2 text-slate-300 cursor-pointer group">
               <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18M3 9h18M3 15h18M3 21h18" />
                  </svg>
                  铺设透水砖
               </span>
               <div 
                 onClick={togglePermeablePaving}
                 className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${permeablePavingEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}
               >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${permeablePavingEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
               </div>
            </label>
            <div className="text-xs text-slate-500 mt-1">
               {permeablePavingEnabled ? '已开启：路面透水，峰值降低、渗流增强。' : '未开启：不透水路面。'}
            </div>
          </div>

          {/* 开始按钮置于三项开关下方，统一区域 */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {simStage === SimStage.IDLE && (
              <button
                onClick={startOrContinue}
                className="py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 col-span-2"
              >
                开始24小时降雨模拟
              </button>
            )}
            {simStage === SimStage.RISING && (
              <button
                disabled
                className="py-3 px-4 rounded-lg bg-slate-700 text-slate-400 font-semibold cursor-not-allowed flex items-center justify-center gap-2 col-span-2"
                title="到达最高水位后自动暂停"
              >
                上升中...
              </button>
            )}
            {simStage === SimStage.PAUSED_PEAK && (
              <button
                onClick={startOrContinue}
                className="py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 col-span-2"
                title={`最高水位 ${waterLevel.toFixed(2)}m`}
              >
                继续回落
              </button>
            )}
            {simStage === SimStage.RECEDING && (
              <button
                disabled
                className="py-3 px-4 rounded-lg bg-slate-700 text-slate-400 font-semibold cursor-not-allowed flex items-center justify-center gap-2 col-span-2"
              >
                回落中...
              </button>
            )}
            <button
              onClick={reset}
              className="py-3 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold transition-all active:scale-95 col-span-2"
            >
              重置
            </button>
          </div>
        </div>

        {/* Remove history UI per requirements */}

        {/* Hydro Comparison Chart (dynamic curves) */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3">
          <div className="text-xs text-slate-400 mb-2">水位变化曲线（对比）</div>
          <svg width="100%" height="160" viewBox="0 0 360 160">
            <rect x="0" y="0" width="360" height="160" fill="transparent" />
            {/* Axes */}
            <line x1="40" y1="130" x2="330" y2="130" stroke="#64748b" />
            <line x1="40" y1="30" x2="40" y2="130" stroke="#64748b" />
            {/* Grid */}
            {[0,12,24,36,48].map(h => (
              <line key={h} x1={40 + (h/48)*290} y1={30} x2={40 + (h/48)*290} y2={130} stroke="#334155" />
            ))}
            {/* Base curve (before) */}
            {(() => {
              const allY = [...curveBase, ...curveIntervention].map((p)=>p[1]);
              const yMin = Math.min(...allY, 0);
              const yMax = Math.max(...allY, 16);
              const scaleX = (h:number)=>40 + (h/48)*290;
              const scaleY = (lv:number)=>130 - ((lv - yMin) / (yMax - yMin)) * 90;
              const pathBase = curveBase.map((p,i)=>`${i===0?'M':'L'}${scaleX(p[0])},${scaleY(p[1])}`).join(' ');
              const pathInter = curveIntervention.map((p,i)=>`${i===0?'M':'L'}${scaleX(p[0])},${scaleY(p[1])}`).join(' ');
              return (
                <g>
                  <path d={pathBase} fill="none" stroke="#ef4444" strokeWidth="2" />
                  <path d={pathInter} fill="none" stroke="#22c55e" strokeWidth="2" />
                </g>
              );
            })()}
            {/* Legend */}
            <g>
              <rect x="200" y="35" width="140" height="32" rx="6" fill="#0f172a" stroke="#334155" />
              <circle cx="215" cy="51" r="4" fill="#ef4444" />
              <text x="225" y="54" fill="#94a3b8" fontSize="10">改造前</text>
              <circle cx="270" cy="51" r="4" fill="#22c55e" />
              <text x="280" y="54" fill="#94a3b8" fontSize="10">改造后</text>
            </g>
          </svg>
          <div className="text-[10px] text-slate-400 mt-1">曲线实时响应参数调节；绿线为当前方案，红线为基准方案。</div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
