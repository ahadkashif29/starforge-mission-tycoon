import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../store";
import { MISSION_MAP } from "../sim/missions";
import { planetTexture } from "./textures";

export function HubScene() {
  const focus = useGame((s) => s.hubFocus ?? s.missionId);
  const kind = MISSION_MAP[focus]?.planet ?? "earth";
  const map = useMemo(() => planetTexture(kind), [kind]);
  const planet = useRef<THREE.Group>(null);
  const sat = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 0, 18);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  useFrame((state, delta) => {
    if (planet.current) planet.current.rotation.y += delta * 0.06;
    if (sat.current) {
      const t = state.clock.elapsedTime * 0.35;
      sat.current.position.set(Math.cos(t) * 8.2 + 6.5, Math.sin(t) * 2.2 - 1, Math.sin(t) * 6);
      sat.current.rotation.set(t, t * 0.7, 0);
    }
  });
  const glow = kind === "earth" ? "#8fc0ff" : kind === "mars" ? "#ffae80" : "#bfeaff";
  return (
    <>
      <color attach="background" args={["#05070b"]} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[-12, 6, 10]} intensity={3} color="#fff1dd" />
      <Stars radius={120} depth={60} count={4000} factor={5} saturation={0.1} fade speed={0.4} />
      <group position={[6.5, -1, 0]}>
        <group ref={planet} rotation={[0.25, 0, 0.18]}>
          <mesh>
            <sphereGeometry args={[5.6, 96, 64]} />
            <meshStandardMaterial map={map} roughness={0.85} />
          </mesh>
          {kind === "ice" && (
            <mesh rotation={[1.25, 0, 0]}>
              <ringGeometry args={[7.2, 10.5, 128]} />
              <meshStandardMaterial color="#cfe6f0" transparent opacity={0.5} side={THREE.DoubleSide} roughness={1} />
            </mesh>
          )}
        </group>
        <mesh>
          <sphereGeometry args={[5.95, 64, 48]} />
          <meshBasicMaterial color={glow} transparent opacity={0.14} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      </group>
      <group ref={sat}>
        <mesh>
          <boxGeometry args={[0.3, 0.3, 0.45]} />
          <meshStandardMaterial color="#d6b25a" metalness={1} roughness={0.35} />
        </mesh>
        <mesh>
          <boxGeometry args={[1.6, 0.02, 0.3]} />
          <meshStandardMaterial color="#1d2f57" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
    </>
  );
}
