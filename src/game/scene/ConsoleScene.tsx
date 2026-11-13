import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { useGame } from "../store";
import { PartMesh, layoutStack } from "./PartMesh";
import { Pad, MOUNT_Y } from "./Pad";
import { StudioLighting } from "./Lighting";
import { getPart } from "../sim/parts";

/** Rocket on the pad plus a preview of the commanded ascent arc. */
export function ConsoleScene() {
  const stack = useGame((s) => s.stack);
  const angle = useGame((s) => s.angle);
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(14, 7, 18);
  }, [camera]);
  const ids = stack.map((p) => p.partId);
  const ys = layoutStack(ids, MOUNT_Y);
  const top = ids.reduce((a, id) => a + getPart(id).height, MOUNT_Y);
  const arc = useMemo(() => {
    const pts: [number, number, number][] = [];
    let x = 0;
    let y = top;
    const pitchMax = ((90 - angle) * Math.PI) / 180;
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const pitch = pitchMax * Math.min(1, t * 1.6) ** 1.4;
      x += Math.sin(pitch) * 0.45;
      y += Math.cos(pitch) * 0.45;
      pts.push([x, y, 0]);
    }
    return pts;
  }, [angle, top]);
  return (
    <>
      <color attach="background" args={["#0d1015"]} />
      <fog attach="fog" args={["#0d1015", 30, 80]} />
      <StudioLighting />
      <Pad />
      {stack.map((p, i) => (
        <group key={p.uid} position={[0, ys[i]!, 0]}>
          <PartMesh partId={p.partId} />
        </group>
      ))}
      <Line points={arc} color="#ff8a3c" lineWidth={2.5} dashed dashSize={0.5} gapSize={0.3} />
      <OrbitControls makeDefault target={[2, top * 0.6 + 2, 0]} enablePan={false} minDistance={10} maxDistance={40} minPolarAngle={0.4} maxPolarAngle={1.5} />
    </>
  );
}
