import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Line, Instance, Instances, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS, HOUSE_POSITIONS, SIMULATION_CONFIG } from '../constants';
import { HouseData } from '../types';

// Add this to make TS happy if the global types aren't picking it up
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

interface ValleySceneProps {
  waterLevel: number;
  vegetationCoverage: number;
  isRaining: boolean;
  drainageEnabled: boolean;
  showPeakIndicator?: boolean;
  rainGardenEnabled?: boolean;
  permeablePavingEnabled?: boolean;
}

// Pseudo-random noise function for organic variety
const pseudoNoise = (x: number, z: number) => {
  return Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.5 + 
         Math.sin(x * 1.5 + z * 0.5) * 0.2 +
         Math.cos(x * 0.1 + z * 2.1) * 0.1;
};

// Reusable height calculation function with Erosion and Detail
const calculateHeight = (x: number, z: number): number => {
  let height = 0;
  
  // Base Noise
  const noise = pseudoNoise(x, z);

  if (x < -5) {
    // Left Bank (Steep hill)
    height = Math.pow(Math.abs(x + 5), 1.5) * 0.5 + 2; 
    // Add roughness to the hill
    height += noise * 0.5;
  } else if (x >= -5 && x < 5) {
    // River Bed
    // Create a bowl shape
    const t = x / 5;
    height = Math.pow(t, 2) * 2; 
    
    // Erosion details on the banks (near -5 and 5)
    const distToBank = Math.min(Math.abs(x - (-5)), Math.abs(x - 5));
    if (distToBank < 2) {
      height -= Math.abs(Math.sin(z * 0.8 + x * 2)) * 0.4; // Scour marks
    }

    // Riverbed roughness
    height += noise * 0.3;
  } else if (x >= 5 && x < 14) {
    // The Terrace (Flattened area)
    const targetHeight = SIMULATION_CONFIG.TERRACE_HEIGHT;
    // Smoother terrace, less noise
    height = targetHeight + Math.sin(x * 2) * 0.05 + noise * 0.1; 
  } else {
    // Right Hill (behind terrace)
    const base = SIMULATION_CONFIG.TERRACE_HEIGHT;
    height = base + Math.pow(x - 14, 1.2) * 0.8;
    // Rockier right hill
    height += noise * 0.6;
  }

  // Add some longitudinal wave to avoid perfect straightness
  height += Math.sin(z * 0.15) * 0.3;
  
  return height;
};

// 1. SOLID TERRAIN (Box Geometry with Vertex Colors)
const Terrain: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const width = 50;
    const depth = 50;
    const heightSegmentBase = 10; // Initial thickness
    const segments = 90;
    
    // Create a box. We will pull the top vertices up to the terrain height.
    const geo = new THREE.BoxGeometry(width, heightSegmentBase, depth, segments, 1, segments);
    
    const posAttribute = geo.attributes.position;
    const colors = [];
    const colorObj = new THREE.Color();
    const cLow = new THREE.Color(COLORS.GRASS_LOW);
    const cHigh = new THREE.Color(COLORS.GRASS_HIGH);
    const cDirt = new THREE.Color(COLORS.TERRACE_DIRT);
    const cRock = new THREE.Color(COLORS.ROCK);
    const cSoil = new THREE.Color(COLORS.SOIL);

    // Calculate slopes and heights
    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const y = posAttribute.getY(i);
      const z = posAttribute.getZ(i);
      
      const isTop = y > 0;
      let finalHeight = y;
      
      if (isTop) {
        // Calculate terrain height
        const terrainHeight = calculateHeight(x, z);
        finalHeight = terrainHeight;
        
        // Approximate Slope Calculation for texturing
        // Sample a tiny bit away
        const hRight = calculateHeight(x + 0.1, z);
        const hForward = calculateHeight(x, z + 0.1);
        // Basic slope vector magnitude
        const slopeX = (hRight - terrainHeight) / 0.1;
        const slopeZ = (hForward - terrainHeight) / 0.1;
        const slope = Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);
        
        // --- Coloring Logic ---
        
        // 1. Base mixing based on height
        if (terrainHeight < 2.5) {
          // River bed / Sand / Mud
          colorObj.copy(cDirt);
          // Mix with rock near water edge for "pebbles" look
          if (Math.random() > 0.7) colorObj.lerp(cRock, 0.3);
        } else {
          // Grass base
          colorObj.copy(cLow);
          if (terrainHeight > 8) colorObj.lerp(cHigh, 0.5);
        }

        // 2. Slope based mixing (Cliffs/Rocks)
        // If slope is steep, show rock
        if (slope > 1.5) {
          colorObj.lerp(cRock, 0.8);
        } else if (slope > 0.8) {
           colorObj.lerp(cRock, 0.4);
        }

        // 3. Terrace Dirt Patch
        // If on terrace flat part, mix in some dirt
        if (x > 6 && x < 13 && slope < 0.5) {
           colorObj.lerp(cDirt, 0.2);
        }

        // 4. Noise variation for natural look
        const n = pseudoNoise(x * 3, z * 3);
        colorObj.offsetHSL(0, 0, n * 0.05);

      } else {
        // Bottom/Sides of the earth slice
        finalHeight = -5; // Base level
        colorObj.copy(cSoil);
        // Darken towards bottom
        if (y < -2) colorObj.offsetHSL(0, 0, -0.1);
      }

      posAttribute.setY(i, finalHeight);
      colors.push(colorObj.r, colorObj.g, colorObj.b);
    }
    
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial 
        vertexColors
        roughness={1}
        metalness={0.0}
        flatShading={true} // Low poly look
      />
    </mesh>
  );
};

// 2. VEGETATION SYSTEM (Dynamic based on Coverage)
const Vegetation: React.FC<{ coverage: number }> = ({ coverage }) => {
  const allTrees = useMemo(() => {
    const trees = [];
    // Generate potential tree positions
    const maxTrees = SIMULATION_CONFIG.MAX_VEGETATION_COUNT;
    
    for (let i = 0; i < maxTrees; i++) {
      const x = (Math.random() - 0.5) * 48;
      const z = (Math.random() - 0.5) * 48;
      
      // Filter locations:
      // 1. Avoid River (x between -5 and 5)
      // 2. Avoid Terrace Flat (x between 5 and 14)
      if (x > -5 && x < 14) continue;
      
      const y = calculateHeight(x, z);
      
      // Randomize Scale
      const scale = 0.5 + Math.random() * 0.8;
      
      trees.push({
        position: [x, y, z] as [number, number, number],
        scale: [scale, scale * (1 + Math.random()), scale] as [number, number, number],
        rotation: [0, Math.random() * Math.PI, 0] as [number, number, number],
        color: Math.random() > 0.5 ? COLORS.TREE_LIGHT : COLORS.TREE_DARK
      });
    }
    return trees;
  }, []);

  // Determine how many to show based on coverage
  const visibleCount = Math.floor(allTrees.length * coverage);

  return (
    <group>
      <Instances range={visibleCount}>
        <coneGeometry args={[0.5, 1.5, 7]} />
        <meshStandardMaterial color={COLORS.TREE_DARK} roughness={0.9} />
        {allTrees.map((data, i) => (
          <group key={i} position={data.position} scale={data.scale} rotation={data.rotation}>
            <Instance color={data.color} />
          </group>
        ))}
      </Instances>
    </group>
  );
};

// 3. RAIN SYSTEM (Particles)
const Rain: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const count = isMobile ? 400 : 1000;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Create dummy object once
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initial positions
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 60;
      const y = Math.random() * 40;
      const z = (Math.random() - 0.5) * 60;
      const speed = 0.5 + Math.random() * 0.5; // Fall speed
      temp.push({ x, y, z, speed });
    }
    return temp;
  }, []);

  useFrame(() => {
    if (!meshRef.current || !enabled) return;

    particles.forEach((particle, i) => {
      // Update position
      particle.y -= particle.speed;
      if (particle.y < -5) {
        particle.y = 30 + Math.random() * 10;
      }
      
      dummy.position.set(particle.x, particle.y, particle.z);
      dummy.scale.set(0.05, 0.8, 0.05); // Thin streaks
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!enabled) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={COLORS.RAIN} transparent opacity={0.6} />
    </instancedMesh>
  );
};

// 4. SCATTERED ROCKS (Existing)
const ScatteredRocks: React.FC = () => {
  const rockData = useMemo(() => {
    const rocks = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 48; 
      const z = (Math.random() - 0.5) * 48;
      const h = calculateHeight(x, z);
      if (x > 6 && x < 13) continue;
      const s = 0.2 + Math.random() * 0.4;
      rocks.push({ position: [x, h, z], scale: s, rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] });
    }
    return rocks;
  }, []);

  return (
    <Instances range={rockData.length}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={COLORS.ROCK} roughness={0.8} />
      {rockData.map((data, i) => (
        <group key={i} position={data.position as [number, number, number]} scale={data.scale} rotation={data.rotation as [number, number, number]}>
          <Instance />
        </group>
      ))}
    </Instances>
  );
};

// 5. CROPS (Existing)
const Crops: React.FC = () => {
  const patches = useMemo(() => {
    const items = [];
    const patchLocations = [
      { cx: 8, cz: 10, w: 3, d: 6, color: COLORS.CROP_1 },
      { cx: 12, cz: -15, w: 3, d: 8, color: COLORS.CROP_2 },
      { cx: 11, cz: 15, w: 4, d: 5, color: COLORS.CROP_1 },
    ];
    for (const p of patchLocations) {
      items.push(
        <mesh key={`${p.cx}-${p.cz}`} position={[p.cx, SIMULATION_CONFIG.TERRACE_HEIGHT + 0.05, p.cz]} receiveShadow>
          <boxGeometry args={[p.w, 0.2, p.d]} />
          <meshStandardMaterial color={p.color} roughness={1} />
        </mesh>
      );
    }
    return items;
  }, []);
  return <group>{patches}</group>;
};

// 6. UTILITY POLES (Existing)
const UtilityPoles: React.FC = () => {
  const poles = useMemo(() => {
    const items = [];
    const xPos = 13.5; 
    const zStart = -20;
    const zEnd = 20;
    const count = 6;
    const step = (zEnd - zStart) / (count - 1);
    const poleHeight = 4;
    const poleCoords: [number, number, number][] = [];

    for (let i = 0; i < count; i++) {
      const z = zStart + i * step;
      const y = calculateHeight(xPos, z);
      poleCoords.push([xPos, y + poleHeight * 0.9, z]);
      items.push(
        <group key={i} position={[xPos, y, z]}>
          <mesh position={[0, poleHeight/2, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.15, poleHeight, 6]} />
            <meshStandardMaterial color={COLORS.POLE} />
          </mesh>
          <mesh position={[0, poleHeight * 0.8, 0]} rotation={[0, 0, Math.PI/2]}>
             <boxGeometry args={[0.15, 1.2, 0.15]} />
             <meshStandardMaterial color="#3f3f46" />
          </mesh>
        </group>
      );
    }
    return { items, poleCoords };
  }, []);

  const wires = useMemo(() => {
    if (poles.poleCoords.length < 2) return null;
    const lines = [];
    for (let i = 0; i < poles.poleCoords.length - 1; i++) {
      const start = new THREE.Vector3(...poles.poleCoords[i]);
      const end = new THREE.Vector3(...poles.poleCoords[i+1]);
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      mid.y -= 0.5; // Sag
      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      const points = curve.getPoints(10);
      lines.push(
        <Line key={`line-${i}`} points={points} color="black" lineWidth={1} opacity={0.7} transparent />
      );
    }
    return lines;
  }, [poles.poleCoords]);

  return <group>{poles.items}{wires}</group>;
};

// 7. DRAINAGE SYSTEM (New)
const DrainageSystem: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  if (!enabled) return null;

  const infrastructure = useMemo(() => {
    const elements = [];
    
    // Manholes scattered near houses on the terrace
    const manholePositions = [
      [8, -3], [10, 2], [7, 6], [9, -8], [11, 12], [8.5, -12], [12, 5], [7.5, 15]
    ];
    
    manholePositions.forEach((pos, idx) => {
      const [x, z] = pos;
      const y = calculateHeight(x, z);
      elements.push(
        <mesh key={`manhole-${idx}`} position={[x, y + 0.05, z]} receiveShadow rotation={[-Math.PI/2, 0, 0]}>
          <circleGeometry args={[0.35, 12]} />
          <meshStandardMaterial color="#2d3748" metalness={0.6} roughness={0.4} />
          {/* Detail ring */}
          <mesh position={[0, 0, 0.02]}>
             <ringGeometry args={[0.25, 0.3, 12]} />
             <meshStandardMaterial color="#1a202c" />
          </mesh>
        </mesh>
      );
    });

    // Outlets pipes along the bank (approx x = 5)
    // Points where the terrace meets the river
    const outletPositions = [-10, -2, 4, 12];
    outletPositions.forEach((z, idx) => {
      const x = 5.2; // Bank edge
      const y = calculateHeight(x, z) - 1.5; // Slightly below bank top
      elements.push(
        <group key={`pipe-${idx}`} position={[x, y, z]} rotation={[0, 0, Math.PI/2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.3, 0.3, 2, 8]} />
            <meshStandardMaterial color="#4a5568" />
          </mesh>
          {/* Dark inner part representing hole */}
          <mesh position={[0, 1.01, 0]} rotation={[Math.PI/2, 0, 0]}>
             <circleGeometry args={[0.25, 8]} />
             <meshBasicMaterial color="#000" />
          </mesh>
        </group>
      );
    });

    return elements;
  }, []);

  return <group>{infrastructure}</group>;
};


// 8. WATER PLANE (Existing)
const Water: React.FC<{ level: number }> = ({ level }) => {
  return (
    <mesh position={[0, level / 2 - 5, 0]}> 
      <boxGeometry args={[49.8, level + 10, 49.8]} /> 
      <meshPhysicalMaterial color={COLORS.WATER} transmission={0.9} opacity={0.8} transparent roughness={0.2} ior={1.33} thickness={2} />
    </mesh>
  );
};

// 9. HOUSE (Existing)
const House: React.FC<{ data: HouseData; waterLevel: number }> = ({ data, waterLevel }) => {
  const submergedDepth = Math.max(0, waterLevel - data.y);
  const isSubmerged = submergedDepth > 0.5;
  const isDeeplySubmerged = submergedDepth > 2.0;
  const width = 2;
  const depth = 2;
  const height = 2;
  const roofHeight = 1;
  const damageState = useMemo(() => ({
      tiltX: (Math.random() - 0.5) * 0.5,
      tiltZ: (Math.random() - 0.5) * 0.5,
      sinkY: -0.5,
      roofRot: (Math.random() - 0.5) * 0.8,
  }), []);
  const currentRotationX = isSubmerged ? damageState.tiltX : 0;
  const currentRotationZ = isSubmerged ? damageState.tiltZ : 0;
  const currentY = isSubmerged ? data.y + damageState.sinkY : data.y;
  const roofColor = isSubmerged ? COLORS.HOUSE_ROOF_WET : COLORS.HOUSE_ROOF;
  const roofOffset = isSubmerged ? [0.2, -0.2, 0] : [0, 0, 0];
  const roofRotZ = isSubmerged ? damageState.roofRot : 0;

  return (
    <group position={[data.x, currentY, data.z]} rotation={[currentRotationX, data.rotation, currentRotationZ]}>
      {isDeeplySubmerged && (
        <Float speed={5} rotationIntensity={0} floatIntensity={0.5}>
          <group position={[0, height + roofHeight + 3, 0]}>
             <mesh><sphereGeometry args={[0.3]} /><meshBasicMaterial color="red" /></mesh>
             <pointLight intensity={1} color="red" distance={8} />
          </group>
        </Float>
      )}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={COLORS.HOUSE_WALL} />
      </mesh>
      <group position={[0 + roofOffset[0], height + roofHeight / 2 + roofOffset[1], 0]} rotation={[0, 0, roofRotZ]}>
        <mesh castShadow><coneGeometry args={[width * 0.8, roofHeight, 4]} /><meshStandardMaterial color={roofColor} /></mesh>
      </group>
      <mesh position={[0, height * 0.4, width / 2 + 0.05]}><planeGeometry args={[0.6, 1.2]} /><meshStandardMaterial color="#475569" /></mesh>
    </group>
  );
};

// 10. Rain Garden on Terrace (3x3m)
const RainGarden: React.FC = () => {
  const x = 9;
  const z = -12;
  const y = calculateHeight(x, z);
  const width = 3;
  const depth = 3;
  const wallH = 0.6;
  const waterH = 0.4;
  return (
    <group position={[x, y, z]}>
      {/* Basin walls */}
      <mesh position={[0, wallH/2, 0]} receiveShadow>
        <boxGeometry args={[width, wallH, depth]} />
        <meshStandardMaterial color="#64748b" roughness={1} />
      </mesh>
      {/* Inner water */}
      <mesh position={[0, waterH/2, 0]}>
        <boxGeometry args={[width*0.9, waterH, depth*0.9]} />
        <meshPhysicalMaterial color={COLORS.WATER} transmission={0.9} opacity={0.6} transparent roughness={0.2} ior={1.33} thickness={1} />
      </mesh>
      {/* Water level indicator */}
      <group position={[width/2 + 0.3, 0, 0]}>
        <mesh position={[0, wallH/2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, wallH, 8]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
        <Billboard position={[0, wallH + 0.2, 0]}>
          <Html center>
            <div className="px-1 py-0.5 rounded bg-green-900/70 border border-green-600/60 text-green-200 text-[10px] font-mono">花园水位</div>
          </Html>
        </Billboard>
      </group>
    </group>
  );
};

// 11. Permeable Paving area on Terrace
const PermeablePaving: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const x = 12.5;
  const z = 8;
  const y = calculateHeight(x, z);
  const size = 4;
  const layerH = 0.4;
  const particleCount = enabled ? 120 : 0;
  const partRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const arr: {x:number;y:number;z:number;speed:number}[] = [];
    for (let i=0;i<particleCount;i++) {
      arr.push({ x: (Math.random()-0.5)*size*0.9, y: 0.3+Math.random()*0.2, z: (Math.random()-0.5)*size*0.9, speed: 0.01+Math.random()*0.02 });
    }
    return arr;
  }, [particleCount, size]);
  useFrame(() => {
    if (!partRef.current || !enabled) return;
    particles.forEach((p,i) => {
      p.y -= p.speed;
      if (p.y < -layerH) { p.y = 0.3+Math.random()*0.2; }
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(0.03, 0.03, 0.03);
      dummy.updateMatrix();
      partRef.current!.setMatrixAt(i, dummy.matrix);
    });
    partRef.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={[x, y, z]}>
      {/* Surface */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[size, 0.04, size]} />
        <meshStandardMaterial color={enabled ? '#d4d4d8' : '#374151'} roughness={enabled ? 0.9 : 1} />
      </mesh>
      {/* Porous texture hint: small grid blocks when enabled */}
      {enabled && (
        <group>
          {Array.from({length:8}).map((_,i) => (
            Array.from({length:8}).map((_,j) => (
              <mesh key={`p-${i}-${j}`} position={[(-size/2)+0.25+i*0.5, 0.05, (-size/2)+0.25+j*0.5]}>
                <boxGeometry args={[0.4, 0.02, 0.4]} />
                <meshStandardMaterial color="#e5e7eb" />
              </mesh>
            ))
          ))}
        </group>
      )}
      {/* Label */}
      <Billboard position={[0, 0.5, size/2 + 0.2]}>
        <Html center>
          <div className={`px-2 py-1 rounded text-[10px] font-mono ${enabled ? 'bg-blue-900/70 border border-blue-600/60 text-blue-200' : 'bg-slate-900/70 border border-slate-700/60 text-slate-300'}`}>{enabled ? '透水' : '不透水'}</div>
        </Html>
      </Billboard>
      {/* Storage layer */}
      {enabled && (
        <mesh position={[0, -layerH/2, 0]}>
          <boxGeometry args={[size*0.9, layerH, size*0.9]} />
          <meshPhysicalMaterial color="#60a5fa" opacity={0.35} transparent transmission={0.8} />
        </mesh>
      )}
      {/* Seepage particles */}
      {enabled && (
        <instancedMesh ref={partRef} args={[undefined, undefined, particleCount]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshBasicMaterial color="#93c5fd" />
        </instancedMesh>
      )}
    </group>
  );
};

const ValleyScene: React.FC<ValleySceneProps> = ({ waterLevel, vegetationCoverage, isRaining, drainageEnabled, showPeakIndicator, rainGardenEnabled, permeablePavingEnabled }) => {
  const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  return (
    <div className="w-full h-full" style={{ willChange: 'transform' }}>
      <Canvas 
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ logarithmicDepthBuffer: true, antialias: !isMobile, powerPreference: 'high-performance' }} 
        camera={{ position: [-18, 14, 18], fov: 45 }}
      >
        <color attach="background" args={isRaining ? ['#475569'] : ['#87CEEB']} />
        
        <ambientLight intensity={isRaining ? 0.3 : 0.5} />
        <directionalLight 
          position={[-10, 20, 5]} 
          intensity={isRaining ? 0.6 : 1.0}
        />

        
        
        

        <group>
          <Terrain />
          <Vegetation coverage={vegetationCoverage} />
          <ScatteredRocks />
          <Crops />
          <UtilityPoles />
          <DrainageSystem enabled={drainageEnabled} />
          <Water level={waterLevel} />
          {rainGardenEnabled && <RainGarden />}
          <PermeablePaving enabled={!!permeablePavingEnabled} />
          {showPeakIndicator && (
            <Billboard position={[0, waterLevel + 0.8, 0]}>
              <Html center>
                <div className="px-2 py-1 rounded bg-blue-900/80 border border-blue-500/60 text-blue-200 text-xs font-mono shadow-md">
                  最高水位 {waterLevel.toFixed(2)}m
                </div>
              </Html>
            </Billboard>
          )}
          <Rain enabled={isRaining} />
          {HOUSE_POSITIONS.map((house) => (
            <House key={house.id} data={house} waterLevel={waterLevel} />
          ))}
          <Billboard position={[0, 6, 0]}>
            <Html transform center pointerEvents="none">
              <div 
                className="text-4xl font-bold text-white whitespace-nowrap drop-shadow-md select-none"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
              >
                姚江
              </div>
            </Html>
          </Billboard>
        </group>

        <OrbitControls 
          target={[5, 2, 0]} 
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={10}
          maxDistance={60}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
};

export default ValleyScene;
