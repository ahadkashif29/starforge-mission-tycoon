import { useMemo } from "react";
import * as THREE from "three";
import { getPart, STACK_RADIUS } from "../sim/parts";
import { foamTexture, goldFoilTexture, hullTexture, solarTexture } from "./textures";

const R = STACK_RADIUS;

function bellGeometry(throat: number, exit: number, length: number) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const r = throat + (exit - throat) * Math.pow(t, 0.6);
    pts.push(new THREE.Vector2(r, -t * length));
  }
  const g = new THREE.LatheGeometry(pts, 40);
  return g;
}

function Metal({ color = "#9aa3ad", rough = 0.32, metal = 0.9 }: { color?: string; rough?: number; metal?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={metal} />;
}

function Flange({ y, r = R + 0.025 }: { y: number; r?: number }) {
  return (
    <mesh position={[0, y, 0]} castShadow>
      <cylinderGeometry args={[r, r, 0.07, 40]} />
      <Metal color="#7d858f" rough={0.28} />
    </mesh>
  );
}

function Bell({ y, throat, exit, length }: { y: number; throat: number; exit: number; length: number }) {
  const geo = useMemo(() => bellGeometry(throat, exit, length), [throat, exit, length]);
  return (
    <mesh geometry={geo} position={[0, y, 0]} castShadow>
      <meshStandardMaterial color="#5b4136" metalness={1} roughness={0.38} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Tank({ h, roll }: { h: number; roll?: boolean }) {
  const map = useMemo(() => (roll ? hullTexture("roll") : foamTexture()), [roll]);
  return (
    <group>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[R, R, h - 0.08, 40]} />
        <meshStandardMaterial map={map} roughness={roll ? 0.45 : 0.75} metalness={roll ? 0.15 : 0.05} />
      </mesh>
      <Flange y={h / 2 - 0.035} />
      <Flange y={-h / 2 + 0.035} />
      {/* feed line */}
      <mesh position={[R + 0.04, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, h - 0.12, 10]} />
        <Metal color="#c9ccd1" />
      </mesh>
    </group>
  );
}

function EngineBase({ h }: { h: number }) {
  return (
    <>
      <mesh position={[0, h / 2 - 0.07, 0]} castShadow>
        <cylinderGeometry args={[R, R, 0.14, 40]} />
        <Metal color="#454b55" rough={0.4} />
      </mesh>
      <mesh position={[0, h / 2 - 0.27, 0]} castShadow>
        <cylinderGeometry args={[R * 0.92, 0.3, 0.26, 24, 1, true]} />
        <Metal color="#3a3f47" rough={0.5} metal={0.7} />
      </mesh>
    </>
  );
}

function Spark({ h }: { h: number }) {
  return (
    <group>
      <EngineBase h={h} />
      <mesh position={[0, h / 2 - 0.47, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.17, 0.18, 20]} />
        <Metal color="#8b8f96" />
      </mesh>
      <Bell y={h / 2 - 0.55} throat={0.15} exit={0.48} length={0.45} />
    </group>
  );
}

function Mammoth({ h }: { h: number }) {
  return (
    <group>
      <EngineBase h={h} />
      <mesh position={[0, h / 2 - 0.47, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.24, 0.2, 20]} />
        <Metal color="#8b8f96" />
      </mesh>
      <Bell y={h / 2 - 0.57} throat={0.22} exit={0.68} length={0.7} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.6, h / 2 - 0.4, 0.25]}>
          <Bell y={0} throat={0.05} exit={0.14} length={0.26} />
        </group>
      ))}
    </group>
  );
}

function Titan({ h }: { h: number }) {
  return (
    <group>
      <EngineBase h={h} />
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38]}>
            <mesh position={[0, h / 2 - 0.45, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.12, 0.16, 16]} />
              <Metal color="#8b8f96" />
            </mesh>
            <Bell y={h / 2 - 0.52} throat={0.11} exit={0.34} length={0.78} />
          </group>
        );
      })}
    </group>
  );
}

function Wisp({ h }: { h: number }) {
  return (
    <group>
      <EngineBase h={h} />
      <mesh position={[0, h / 2 - 0.45, 0]} castShadow>
        <sphereGeometry args={[0.2, 20, 12]} />
        <Metal color="#c7a35b" rough={0.25} metal={1} />
      </mesh>
      <Bell y={h / 2 - 0.58} throat={0.09} exit={0.42} length={0.5} />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[0, h / 2 - 0.35, 0]} castShadow>
          <boxGeometry args={[1.5, 0.12, 0.02]} />
          <Metal color="#d8d8d2" rough={0.5} metal={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Kestrel({ h }: { h: number }) {
  const map = useMemo(() => hullTexture("white"), []);
  return (
    <group>
      <mesh position={[0, -0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, R, h - 0.36, 40]} />
        <meshStandardMaterial map={map} roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[0, h / 2 - 0.13, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.3, 0.26, 24]} />
        <Metal color="#5b616b" />
      </mesh>
      <mesh position={[0, -h / 2 + 0.05, 0]} castShadow>
        <cylinderGeometry args={[R + 0.02, R + 0.02, 0.1, 40]} />
        <meshStandardMaterial color="#3d2a20" roughness={0.9} />
      </mesh>
      {[-0.35, 0.35].map((a) => (
        <mesh key={a} position={[Math.sin(a) * 0.58, 0.02, Math.cos(a) * 0.58]} rotation={[-0.42, a, 0]}>
          <boxGeometry args={[0.18, 0.2, 0.04]} />
          <meshStandardMaterial color="#0c1420" roughness={0.05} metalness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Atlas({ h }: { h: number }) {
  const map = useMemo(() => hullTexture("white"), []);
  return (
    <group>
      <mesh position={[0, -0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, R, h - 0.4, 40]} />
        <meshStandardMaterial map={map} roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh position={[0, h / 2 - 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.42, 0.3, 24]} />
        <Metal color="#4b515a" />
      </mesh>
      <mesh position={[0, h / 2 + 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.5, 6]} />
        <Metal color="#cfd2d6" />
      </mesh>
      <mesh position={[0, -h / 2 + 0.06, 0]} castShadow>
        <cylinderGeometry args={[R + 0.03, R + 0.03, 0.12, 40]} />
        <meshStandardMaterial color="#3d2a20" roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.66, -0.25, Math.sin(a) * 0.66]} castShadow>
            <boxGeometry args={[0.14, 0.14, 0.14]} />
            <Metal color="#2f343b" rough={0.5} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.05, 0.6]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[0.3, 0.16, 0.04]} />
        <meshStandardMaterial color="#0c1420" roughness={0.05} metalness={0.9} />
      </mesh>
    </group>
  );
}

function Probe({ h }: { h: number }) {
  const gold = useMemo(() => goldFoilTexture(), []);
  const solar = useMemo(() => solarTexture(), []);
  return (
    <group>
      <mesh position={[0, -h / 2 + 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.5, R, 0.3, 32]} />
        <Metal color="#6e747c" />
      </mesh>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.5, 8]} />
        <meshStandardMaterial map={gold} metalness={1} roughness={0.35} />
      </mesh>
      <mesh position={[0, h / 2 - 0.12, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <sphereGeometry args={[0.38, 24, 10, 0, Math.PI * 2, 0, 0.9]} />
        <meshStandardMaterial color="#e8e6e0" roughness={0.4} metalness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.56, 0.05, 0]} castShadow>
          <boxGeometry args={[0.03, 0.48, 0.42]} />
          <meshStandardMaterial map={solar} metalness={0.6} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/** Procedural mesh for a part, centered on its origin (height = part.height). */
export function PartMesh({ partId }: { partId: string }) {
  const p = getPart(partId);
  const h = p.height;
  switch (p.look) {
    case "kestrel": return <Kestrel h={h} />;
    case "atlas": return <Atlas h={h} />;
    case "probe": return <Probe h={h} />;
    case "tank-s": return <Tank h={h} roll />;
    case "tank-m": return <Tank h={h} />;
    case "tank-l": return <Tank h={h} />;
    case "spark": return <Spark h={h} />;
    case "mammoth": return <Mammoth h={h} />;
    case "wisp": return <Wisp h={h} />;
    case "titan": return <Titan h={h} />;
    default: return null;
  }
}

/** Stack layout: center Y of each part (top-first array) given a base Y. */
export function layoutStack(partIds: string[], baseY: number): number[] {
  const ys = new Array<number>(partIds.length);
  let y = baseY;
  for (let i = partIds.length - 1; i >= 0; i--) {
    const h = getPart(partIds[i]!).height;
    ys[i] = y + h / 2;
    y += h;
  }
  return ys;
}
