
import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Line, Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS, HOUSE_POSITIONS, SIMULATION_CONFIG } from '../constants';
import { HouseData } from '../types';

// Add this to make TS happy if the global types aren't picking it up
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

interface ValleySceneProps {
  waterLevel: number;
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
    const segments = 120; // Increased resolution for better erosion details
    
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

// 2. SCATTERED ROCKS
const ScatteredRocks: React.FC = () => {
  const rockData = useMemo(() => {
    const rocks = [];
    const count = 60;
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 48; // -24 to 24
      const z = (Math.random() - 0.5) * 48;
      
      const h = calculateHeight(x, z);
      
      // Avoid placing rocks on the main housing terrace flat area
      // Terrace is roughly x: 6 to 13
      if (x > 6 && x < 13) continue;

      // Prefer riverbed and slopes
      // Random scale
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

// 3. CROPS (Farmland on Terrace)
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
        <mesh 
          key={`${p.cx}-${p.cz}`} 
          position={[p.cx, SIMULATION_CONFIG.TERRACE_HEIGHT + 0.05, p.cz]} 
          receiveShadow
        >
          <boxGeometry args={[p.w, 0.2, p.d]} />
          <meshStandardMaterial color={p.color} roughness={1} />
        </mesh>
      );
    }
    return items;
  }, []);

  return <group>{patches}</group>;
};

// 4. UTILITY POLES
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
        <Line 
          key={`line-${i}`} 
          points={points} 
          color="black" 
          lineWidth={1} 
          opacity={0.7}
          transparent
        />
      );
    }
    return lines;
  }, [poles.poleCoords]);

  return (
    <group>
      {poles.items}
      {wires}
    </group>
  );
};

// 5. WATER PLANE (Fixed Z-fighting)
const Water: React.FC<{ level: number }> = ({ level }) => {
  return (
    // Slightly reduced size (49.8 instead of 50) to prevent z-fighting with terrain walls
    <mesh position={[0, level / 2 - 5, 0]}> 
      <boxGeometry args={[49.8, level + 10, 49.8]} /> 
      <meshPhysicalMaterial
        color={COLORS.WATER}
        transmission={0.9}
        opacity={0.8}
        transparent
        roughness={0.2}
        ior={1.33}
        thickness={2}
      />
    </mesh>
  );
};

// 6. DAMAGED HOUSE LOGIC
const House: React.FC<{ data: HouseData; waterLevel: number }> = ({ data, waterLevel }) => {
  const submergedDepth = Math.max(0, waterLevel - data.y);
  const isSubmerged = submergedDepth > 0.5;
  const isDeeplySubmerged = submergedDepth > 2.0;

  const width = 2;
  const depth = 2;
  const height = 2;
  const roofHeight = 1;

  const damageState = useMemo(() => {
    return {
      tiltX: (Math.random() - 0.5) * 0.5,
      tiltZ: (Math.random() - 0.5) * 0.5,
      sinkY: -0.5,
      roofRot: (Math.random() - 0.5) * 0.8,
    };
  }, []);

  const currentRotationX = isSubmerged ? damageState.tiltX : 0;
  const currentRotationZ = isSubmerged ? damageState.tiltZ : 0;
  const currentY = isSubmerged ? data.y + damageState.sinkY : data.y;
  const roofColor = isSubmerged ? COLORS.HOUSE_ROOF_WET : COLORS.HOUSE_ROOF;
  
  const roofOffset = isSubmerged ? [0.2, -0.2, 0] : [0, 0, 0];
  const roofRotZ = isSubmerged ? damageState.roofRot : 0;

  return (
    <group 
      position={[data.x, currentY, data.z]} 
      rotation={[currentRotationX, data.rotation, currentRotationZ]}
    >
      {isDeeplySubmerged && (
        <Float speed={5} rotationIntensity={0} floatIntensity={0.5}>
          <group position={[0, height + roofHeight + 3, 0]}>
             <mesh>
               <sphereGeometry args={[0.3]} />
               <meshBasicMaterial color="red" />
             </mesh>
             <pointLight intensity={1} color="red" distance={8} />
          </group>
        </Float>
      )}

      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={COLORS.HOUSE_WALL} />
      </mesh>
      
      <group 
        position={[0 + roofOffset[0], height + roofHeight / 2 + roofOffset[1], 0]} 
        rotation={[0, 0, roofRotZ]}
      >
        <mesh castShadow>
          <coneGeometry args={[width * 0.8, roofHeight, 4]} />
          <meshStandardMaterial color={roofColor} />
        </mesh>
      </group>
      
      <mesh position={[0, height * 0.4, width / 2 + 0.05]}>
        <planeGeometry args={[0.6, 1.2]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
    </group>
  );
};

const ValleyScene: React.FC<ValleySceneProps> = ({ waterLevel }) => {
  return (
    <div className="w-full h-full">
      {/* Logarithmic depth buffer helps with z-fighting in large scenes or close-ups */}
      <Canvas shadows gl={{ logarithmicDepthBuffer: true }} camera={{ position: [-18, 14, 18], fov: 45 }}>
        <color attach="background" args={['#87CEEB']} />
        
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[-10, 20, 5]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0005}
        >
          <orthographicCamera attach="shadow-camera" args={[-30, 30, 30, -30]} />
        </directionalLight>
        
        <Environment preset="city" />

        <group>
          <Terrain />
          <ScatteredRocks />
          <Crops />
          <UtilityPoles />
          <Water level={waterLevel} />
          {HOUSE_POSITIONS.map((house) => (
            <House key={house.id} data={house} waterLevel={waterLevel} />
          ))}
        </group>

        <OrbitControls 
          target={[5, 2, 0]} 
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={10}
          maxDistance={60}
        />
      </Canvas>
    </div>
  );
};

export default ValleyScene;
