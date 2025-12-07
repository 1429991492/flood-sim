import React, { useLayoutEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, ContactShadows, Float } from '@react-three/drei';
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

// Custom Terrain Geometry
const Terrain: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Generate heightmap logic
  // x goes from -20 to 20
  // z goes from -20 to 20
  const geometry = useMemo(() => {
    const width = 50;
    const depth = 50;
    const segments = 128;
    const geo = new THREE.PlaneGeometry(width, depth, segments, segments);
    
    const posAttribute = geo.attributes.position;
    
    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      // const y = posAttribute.getY(i); // In PlaneGeometry, Y is actually Z in world space if rotated, but here we modify Z (height) before rotation or modify Z and rotate mesh -90
      // Actually standard Plane is X, Y. We map Y to world Z later. 
      // Let's assume standard orientation X, Y (local) -> X, Z (world). The displacement is in Z (local).
      
      let height = 0;
      
      // Valley Shape Logic based on X coordinate
      // River bed: x around 0
      // Terrace: x between 6 and 14
      // Hills: x < -5 and x > 15
      
      if (x < -5) {
        // Left Bank (Steep hill)
        height = Math.pow(Math.abs(x + 5), 1.5) * 0.5 + 2; 
      } else if (x >= -5 && x < 5) {
        // River Bed (Smooth curve)
        // Normalized t from -1 to 1
        const t = x / 5;
        height = Math.pow(t, 2) * 2; // Simple parabola centered at 0
      } else if (x >= 5 && x < 14) {
        // The Terrace (Flattened area)
        // Smooth transition to terrace height
        const t = (x - 5) / 9; // 0 to 1
        const targetHeight = SIMULATION_CONFIG.TERRACE_HEIGHT;
        
        // Slight noise/variation on terrace
        height = targetHeight + Math.sin(x * 2) * 0.1; 
      } else {
        // Right Hill (behind terrace)
        const base = SIMULATION_CONFIG.TERRACE_HEIGHT;
        height = base + Math.pow(x - 14, 1.2) * 0.8;
      }

      // Add some longitudinal noise (along Z axis which is Y in local space)
      const zLocal = posAttribute.getY(i);
      height += Math.sin(zLocal * 0.2) * 0.5;

      // Set Z (height in local space)
      posAttribute.setZ(i, height);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial 
        vertexColors={false} 
        color={COLORS.GRASS_LOW}
        roughness={0.8}
        metalness={0.1}
        flatShading={true}
      />
    </mesh>
  );
};

// Water Plane
const Water: React.FC<{ level: number }> = ({ level }) => {
  return (
    <mesh position={[0, level / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <boxGeometry args={[50, 50, level]} /> 
      {/* Using a box for water to give it "depth" below surface visually, simpler than volume rendering */}
      {/* We position at level/2 so the top face is at 'level' */}
      <meshPhysicalMaterial
        color={COLORS.WATER}
        transmission={0.9} // Glass-like
        opacity={0.8}
        transparent
        roughness={0.2}
        ior={1.33}
        thickness={2.0} // Refraction thickness
      />
    </mesh>
  );
};

// Simple House Component
const House: React.FC<{ data: HouseData; waterLevel: number }> = ({ data, waterLevel }) => {
  const submergedDepth = Math.max(0, waterLevel - data.y);
  const isSubmerged = submergedDepth > 0;
  
  // House dimensions
  const width = 2;
  const depth = 2;
  const height = 2;
  const roofHeight = 1;

  return (
    <group position={[data.x, data.y, data.z]} rotation={[0, data.rotation, 0]}>
      {/* Visual Indicator of danger */}
      {isSubmerged && (
        <Float speed={5} rotationIntensity={0} floatIntensity={0.5}>
          <group position={[0, height + roofHeight + 1, 0]}>
             <mesh>
               <sphereGeometry args={[0.3]} />
               <meshBasicMaterial color="red" />
             </mesh>
             <pointLight intensity={1} color="red" distance={5} />
          </group>
        </Float>
      )}

      {/* Base/Walls */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={COLORS.HOUSE_WALL} />
      </mesh>
      
      {/* Roof */}
      <mesh position={[0, height + roofHeight / 2, 0]} castShadow>
        <coneGeometry args={[width * 0.8, roofHeight, 4]} />
        <meshStandardMaterial color={COLORS.HOUSE_ROOF} />
      </mesh>
      
      {/* Door */}
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
      <Canvas shadows camera={{ position: [-15, 12, 15], fov: 45 }}>
        <color attach="background" args={['#87CEEB']} />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[-10, 20, 5]} 
          intensity={1} 
          castShadow 
          shadow-mapSize={[1024, 1024]} 
        >
          <orthographicCamera attach="shadow-camera" args={[-25, 25, 25, -25]} />
        </directionalLight>
        
        <Environment preset="city" />

        {/* Scene Objects */}
        <group>
          <Terrain />
          <Water level={waterLevel} />
          {HOUSE_POSITIONS.map((house) => (
            <House key={house.id} data={house} waterLevel={waterLevel} />
          ))}
        </group>

        {/* Controls */}
        <OrbitControls 
          target={[5, 4, 0]} 
          maxPolarAngle={Math.PI / 2 - 0.1} // Prevent going under ground
          minDistance={5}
          maxDistance={50}
        />
      </Canvas>
    </div>
  );
};

export default ValleyScene;