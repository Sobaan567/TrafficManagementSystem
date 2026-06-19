import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Html, Line, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import './TrafficScene3D.css';

const roadMaterial = { color: '#151515', roughness: 0.82, metalness: 0.08 };
const asphaltLineMaterial = { color: '#f8f4e8', roughness: 0.5 };
const accentMaterial = { color: '#d2e823', emissive: '#9eb200', emissiveIntensity: 0.22 };

const BUILDINGS = [
  [-28, -20, 5, 18, 7, '#3b82f6'], [-18, -24, 8, 26, 9, '#06b6d4'], [-4, -26, 7, 14, 7, '#a855f7'],
  [16, -24, 9, 32, 8, '#f97316'], [30, -18, 6, 20, 10, '#22c55e'], [-30, -6, 8, 22, 8, '#f43f5e'],
  [-16, -6, 7, 34, 6, '#14b8a6'], [18, -6, 7, 24, 7, '#eab308'], [32, -2, 6, 16, 6, '#60a5fa'],
  [-28, 16, 7, 24, 8, '#fb7185'], [-12, 18, 9, 30, 7, '#34d399'], [8, 20, 8, 18, 9, '#818cf8'],
  [24, 16, 7, 28, 8, '#f59e0b'], [36, 18, 5, 14, 7, '#2dd4bf'],
];

const VEHICLES = [
  { lane: 'x', offset: -4.8, speed: 0.32, color: '#d2e823', delay: 0 },
  { lane: 'x', offset: 4.8, speed: -0.24, color: '#ff3b3b', delay: 18 },
  { lane: 'x', offset: -1.6, speed: 0.42, color: '#38bdf8', delay: 35 },
  { lane: 'z', offset: 4.8, speed: 0.28, color: '#f8f4e8', delay: 8 },
  { lane: 'z', offset: -4.8, speed: -0.36, color: '#ff851b', delay: 24 },
  { lane: 'z', offset: 1.6, speed: 0.2, color: '#a78bfa', delay: 42 },
];

const ALERTS = [
  { position: [-22, 1.2, -14], color: '#ff3b3b', label: 'HIGH' },
  { position: [14, 1.2, 18], color: '#ff851b', label: 'MED' },
  { position: [28, 1.2, -10], color: '#85144b', label: 'CRIT' },
];

const DEFAULT_OFFICERS = [
  { id: 1, name: 'Shafiq Rana', lat: 24.8607, lng: 67.0011, assignedZone: 'Karachi Central' },
  { id: 2, name: 'Ayesha Khan', lat: 24.8738, lng: 67.0321, assignedZone: 'Saddar' },
  { id: 3, name: 'Bilal Ahmed', lat: 24.918, lng: 67.0971, assignedZone: 'Gulshan-e-Iqbal' },
];

const KARACHI_CENTER = { lat: 24.8607, lng: 67.0011 };
const OFFICER_COLORS = ['#d2e823', '#38bdf8', '#ff851b', '#f472b6', '#34d399', '#a78bfa'];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getOfficerScenePosition = (officer, index) => {
  const lat = Number(officer.lat ?? officer.latitude ?? KARACHI_CENTER.lat);
  const lng = Number(officer.lng ?? officer.longitude ?? KARACHI_CENTER.lng);
  const fallbackAngle = index * 2.1;
  const fallbackRadius = 14 + index * 4;
  const x = Number.isFinite(lng)
    ? clamp((lng - KARACHI_CENTER.lng) * 620, -38, 38)
    : Math.cos(fallbackAngle) * fallbackRadius;
  const z = Number.isFinite(lat)
    ? clamp((KARACHI_CENTER.lat - lat) * 620, -38, 38)
    : Math.sin(fallbackAngle) * fallbackRadius;

  return [x, 1.05, z];
};

const Building = ({ x, z, width, height, depth, color, index }) => {
  const windowRows = Math.max(2, Math.floor(height / 5));
  return (
    <group position={[x, height / 2 - 1.1, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} roughness={0.68} metalness={0.18} />
      </mesh>
      <mesh position={[0, height / 2 + 0.08, 0]} receiveShadow>
        <boxGeometry args={[width + 0.45, 0.25, depth + 0.45]} />
        <meshStandardMaterial {...accentMaterial} />
      </mesh>
      {Array.from({ length: windowRows }).map((_, row) => (
        <mesh key={`${index}-w-${row}`} position={[0, -height / 2 + 3 + row * 4, depth / 2 + 0.04]}>
          <boxGeometry args={[width * 0.68, 0.45, 0.08]} />
          <meshStandardMaterial color="#f8f4e8" emissive="#d2e823" emissiveIntensity={row % 2 ? 0.14 : 0.04} />
        </mesh>
      ))}
    </group>
  );
};

const MovingVehicle = ({ lane, offset, speed, color, delay }) => {
  const ref = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed * 18 + delay;
    const wrapped = ((t + 48) % 96) - 48;
    if (!ref.current) return;

    if (lane === 'x') {
      ref.current.position.set(wrapped, 0.2, offset);
      ref.current.rotation.y = speed > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      ref.current.position.set(offset, 0.2, wrapped);
      ref.current.rotation.y = speed > 0 ? 0 : Math.PI;
    }
  });

  return (
    <group ref={ref}>
      <mesh castShadow>
        <boxGeometry args={[2.2, 0.75, 4]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.55, -0.35]} castShadow>
        <boxGeometry args={[1.45, 0.52, 1.55]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.05, 2.1]}>
        <boxGeometry args={[1.2, 0.12, 0.08]} />
        <meshStandardMaterial color="#f8f4e8" emissive="#f8f4e8" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
};

const AlertBeacon = ({ position, color }) => {
  const pulse = useRef();

  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const scale = 1 + Math.sin(clock.getElapsedTime() * 3.2) * 0.18;
    pulse.current.scale.setScalar(scale);
  });

  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.35, 0.35, 2.4, 24]} />
        <meshStandardMaterial color="#09090b" />
      </mesh>
      <mesh ref={pulse} position={[0, 1.6, 0]}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.25} transparent opacity={0.72} />
      </mesh>
      <pointLight position={[0, 2.2, 0]} color={color} intensity={1.5} distance={18} />
    </group>
  );
};

const LaneMarkings = () => {
  const marks = useMemo(() => Array.from({ length: 18 }, (_, i) => -43 + i * 5), []);
  return (
    <group position={[0, -0.84, 0]}>
      {marks.map((x) => (
        <mesh key={`mx-${x}`} position={[x, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.2, 0.18]} />
          <meshStandardMaterial {...asphaltLineMaterial} />
        </mesh>
      ))}
      {marks.map((z) => (
        <mesh key={`mz-${z}`} position={[0, 0.04, z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[2.2, 0.18]} />
          <meshStandardMaterial {...asphaltLineMaterial} />
        </mesh>
      ))}
    </group>
  );
};

const RouteTrail = () => {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.6) * 0.05;
  });

  return (
    <group ref={ref} position={[0, -0.72, 0]}>
      <mesh position={[0, 0.05, -8]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[12, 0.08, 8, 96, Math.PI * 1.45]} />
        <meshStandardMaterial color="#d2e823" emissive="#d2e823" emissiveIntensity={0.75} />
      </mesh>
      <mesh position={[10, 0.05, 5]} rotation={[-Math.PI / 2, 0, 1.1]}>
        <torusGeometry args={[8, 0.07, 8, 96, Math.PI * 1.2]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
};

const TrafficSignal = ({ position, green }) => (
  <group position={position}>
    <mesh castShadow>
      <cylinderGeometry args={[0.18, 0.18, 4, 16]} />
      <meshStandardMaterial color="#09090b" />
    </mesh>
    <mesh position={[0, 2.1, 0]}>
      <boxGeometry args={[0.95, 1.8, 0.55]} />
      <meshStandardMaterial color="#111827" />
    </mesh>
    {['#ff3b3b', '#ff851b', '#2ecc40'].map((color, index) => {
      const active = green ? index === 2 : index === 0;
      return (
        <mesh key={color} position={[0, 2.58 - index * 0.48, 0.31]}>
          <sphereGeometry args={[0.16, 18, 18]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.2 : 0.08} />
        </mesh>
      );
    })}
  </group>
);

const OfficerUnit = ({ officer, index }) => {
  const group = useRef();
  const ring = useRef();
  const beacon = useRef();
  const color = OFFICER_COLORS[index % OFFICER_COLORS.length];
  const position = useMemo(() => getOfficerScenePosition(officer, index), [officer, index]);
  const label = officer.name || `Officer ${index + 1}`;
  const zone = officer.assignedZone || officer.zone || 'Patrol Unit';

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (group.current) group.current.position.y = position[1] + Math.sin(time * 2 + index) * 0.12;
    if (ring.current) {
      const scale = 1.15 + Math.sin(time * 2.4 + index) * 0.08;
      ring.current.scale.set(scale, scale, scale);
      ring.current.rotation.z = time * 0.5;
    }
    if (beacon.current) beacon.current.rotation.y = time * 1.4;
  });

  return (
    <group position={position}>
      <Line points={[[0, -0.92, 0], [-position[0], -0.9, -position[2]]]} color={color} lineWidth={1.2} transparent opacity={0.48} />
      <mesh ref={ring} position={[0, -0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.15, 0.045, 8, 72]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.1, 3.22, 72]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} transparent opacity={0.34} />
      </mesh>
      <group ref={group}>
        <mesh castShadow>
          <cylinderGeometry args={[0.8, 0.95, 0.42, 6]} />
          <meshStandardMaterial color="#09090b" roughness={0.35} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.45, 0]} castShadow>
          <sphereGeometry args={[0.64, 24, 24]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} roughness={0.28} />
        </mesh>
        <mesh ref={beacon} position={[0, 1.1, 0]}>
          <coneGeometry args={[0.34, 1.2, 24]} />
          <meshStandardMaterial color="#f8f4e8" emissive={color} emissiveIntensity={0.85} transparent opacity={0.9} />
        </mesh>
        <pointLight color={color} intensity={1.8} distance={18} position={[0, 1.6, 0]} />
        <Html center distanceFactor={18} position={[0, 2.55, 0]} className="officer-3d-label">
          <strong>{label}</strong>
          <span>{zone}</span>
        </Html>
      </group>
    </group>
  );
};

const CommandCore = ({ officerCount }) => {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.45;
  });

  return (
    <group position={[0, 1.35, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[2.2, 2.45, 1.2, 8]} />
        <meshStandardMaterial color="#09090b" roughness={0.35} metalness={0.25} />
      </mesh>
      <mesh ref={ref} position={[0, 1.05, 0]}>
        <torusGeometry args={[2.8, 0.05, 8, 96]} />
        <meshStandardMaterial color="#d2e823" emissive="#d2e823" emissiveIntensity={1.1} />
      </mesh>
      <Html center distanceFactor={22} position={[0, 2.35, 0]} className="command-3d-label">
        <strong>{officerCount}</strong>
        <span>active officers</span>
      </Html>
    </group>
  );
};

const CityScene = ({ officers }) => (
  <group rotation={[0, -0.15, 0]}>
    <mesh position={[0, -1, 0]} receiveShadow>
      <boxGeometry args={[96, 0.45, 96]} />
      <meshStandardMaterial color="#d2e823" roughness={0.92} />
    </mesh>

    <mesh position={[0, -0.74, 0]} receiveShadow>
      <boxGeometry args={[96, 0.18, 10]} />
      <meshStandardMaterial {...roadMaterial} />
    </mesh>
    <mesh position={[0, -0.73, 0]} receiveShadow>
      <boxGeometry args={[10, 0.2, 96]} />
      <meshStandardMaterial {...roadMaterial} />
    </mesh>
    <mesh position={[0, -0.69, 0]} receiveShadow>
      <boxGeometry args={[15, 0.12, 15]} />
      <meshStandardMaterial color="#202020" roughness={0.7} />
    </mesh>

    <LaneMarkings />
    <RouteTrail />
    <CommandCore officerCount={officers.length} />

    {BUILDINGS.map(([x, z, width, height, depth, color], index) => (
      <Building key={`${x}-${z}`} x={x} z={z} width={width} height={height} depth={depth} color={color} index={index} />
    ))}

    {VEHICLES.map((vehicle, index) => <MovingVehicle key={index} {...vehicle} />)}
    {ALERTS.map((alert) => <AlertBeacon key={alert.label} {...alert} />)}
    {officers.map((officer, index) => <OfficerUnit key={officer.id || officer.name || index} officer={officer} index={index} />)}

    <TrafficSignal position={[-7, 1.1, -7]} green />
    <TrafficSignal position={[7, 1.1, 7]} green={false} />
    <TrafficSignal position={[-7, 1.1, 7]} green />
    <TrafficSignal position={[7, 1.1, -7]} green={false} />
  </group>
);

const TrafficScene3D = ({ officers = DEFAULT_OFFICERS }) => {
  const officerUnits = (officers.length ? officers : DEFAULT_OFFICERS)
    .filter((officer) => officer && (officer.name || officer.id))
    .slice(0, 12);

  return (
  <div className="traffic-scene-3d">
    <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <PerspectiveCamera makeDefault position={[46, 34, 46]} fov={45} />
      <color attach="background" args={['#09090b']} />
      <fog attach="fog" args={['#09090b', 70, 135]} />

      <ambientLight intensity={0.42} />
      <hemisphereLight args={['#d2e823', '#09090b', 0.48]} />
      <directionalLight
        position={[18, 42, 28]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
      />
      <pointLight position={[0, 12, 0]} color="#d2e823" intensity={1.1} distance={45} />

      <CityScene officers={officerUnits} />
      <Environment preset="city" />

      <OrbitControls
        autoRotate
        autoRotateSpeed={0.65}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2.18}
        minDistance={28}
        maxDistance={95}
      />
    </Canvas>

    <div className="scene-hud">
      <div>
        <span>Officer 3D Ops</span>
        <strong>Live Patrol Grid</strong>
      </div>
      <ul>
        <li><b>{officerUnits.length}</b> officers</li>
        <li><b>3</b> alert beacons</li>
        <li><b>4</b> smart signals</li>
      </ul>
    </div>
  </div>
  );
};

export default TrafficScene3D;
