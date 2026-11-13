import { useMemo } from "react";
import { deckTexture } from "./textures";
import { DECK_X, DECK_Z } from "../store";

export const MOUNT_Y = 0.5;

/** Launch deck, mount clamp, gantry tower and floodlights. */
export function Pad({ ground = "hangar" }: { ground?: "hangar" | "field" }) {
  const deck = useMemo(() => deckTexture(), []);
  return (
    <group>
      <mesh position={[0, -0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[DECK_X * 2, 0.4, DECK_Z * 2]} />
        <meshStandardMaterial map={deck} roughness={0.92} metalness={0.05} />
      </mesh>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.41, 0]} receiveShadow>
        <circleGeometry args={[ground === "field" ? 260 : 60, 48]} />
        <meshStandardMaterial color={ground === "field" ? "#56683f" : "#1b1f26"} roughness={1} />
      </mesh>
      {/* mount */}
      <mesh position={[0, MOUNT_Y / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.95, 1.15, MOUNT_Y, 8]} />
        <meshStandardMaterial color="#3b3f46" roughness={0.6} metalness={0.6} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.95, MOUNT_Y + 0.15, Math.sin(a) * 0.95]} castShadow>
            <boxGeometry args={[0.18, 0.3, 0.18]} />
            <meshStandardMaterial color="#d79a2b" roughness={0.5} metalness={0.4} />
          </mesh>
        );
      })}
      <Gantry />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (DECK_X - 0.4), 0, -DECK_Z + 0.4]}>
          <mesh position={[0, 1.4, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.07, 2.8, 8]} />
            <meshStandardMaterial color="#555b63" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[0, 2.85, 0]} rotation={[0.5, s * -0.6, 0]}>
            <boxGeometry args={[0.5, 0.3, 0.12]} />
            <meshStandardMaterial color="#fff3d6" emissive="#ffe9b8" emissiveIntensity={2.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Gantry() {
  const H = 12;
  const legs: [number, number][] = [[-2.6, -2.6], [-1.6, -2.6], [-2.6, -1.6], [-1.6, -1.6]];
  return (
    <group>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, H / 2, z]} castShadow>
          <boxGeometry args={[0.12, H, 0.12]} />
          <meshStandardMaterial color="#b0452a" roughness={0.6} metalness={0.5} />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <group key={i} position={[-2.1, 0.6 + i, -2.1]}>
          <mesh>
            <boxGeometry args={[1.1, 0.06, 0.06]} />
            <meshStandardMaterial color="#8c3721" roughness={0.6} metalness={0.5} />
          </mesh>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[1.1, 0.06, 0.06]} />
            <meshStandardMaterial color="#8c3721" roughness={0.6} metalness={0.5} />
          </mesh>
          <mesh rotation={[0, 0, 0.8]} position={[0, 0.5, 0.5]}>
            <boxGeometry args={[1.4, 0.04, 0.04]} />
            <meshStandardMaterial color="#8c3721" roughness={0.6} metalness={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[-1.3, H - 1, -1.3]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[1.4, 0.12, 0.25]} />
        <meshStandardMaterial color="#8c3721" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[-2.1, H + 0.3, -2.1]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color="#ff4a2a" emissive="#ff3b1a" emissiveIntensity={3} />
      </mesh>
    </group>
  );
}
