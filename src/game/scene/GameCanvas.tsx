import { Component, Suspense, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../store";
import { HangarScene } from "./HangarScene";
import { HubScene } from "./HubScene";
import { ConsoleScene } from "./ConsoleScene";
import { FlightScene } from "./FlightScene";
import { sceneRefs } from "./sceneRefs";

function ReadySignal({ wrapper }: { wrapper: React.RefObject<HTMLDivElement | null> }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
    if (frames.current === 2 && wrapper.current) wrapper.current.dataset.sceneReady = "1";
  });
  return null;
}

class SceneBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override render() {
    if (this.state.error)
      return (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive">
          3D view crashed: {this.state.error.message}
        </div>
      );
    return this.props.children;
  }
}

export function GameCanvas() {
  const screen = useGame((s) => s.screen);
  const wrapper = useRef<HTMLDivElement>(null);

  const onDrop = (e: React.DragEvent) => {
    const partId = e.dataTransfer.getData("text/space-max-part");
    if (!partId || screen !== "hangar") return;
    e.preventDefault();
    const cam = sceneRefs.camera;
    const dom = sceneRefs.dom;
    if (!cam || !dom) return useGame.getState().spawnPart(partId);
    const r = dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, cam);
    const hit = new THREE.Vector3();
    if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) {
      let x = hit.x;
      if (Math.abs(x) < 1.6 && Math.abs(hit.z) < 1.6) x = x < 0 ? -2.4 : 2.4;
      useGame.getState().spawnPart(partId, x, hit.z);
    } else useGame.getState().spawnPart(partId);
  };

  return (
    <div
      ref={wrapper}
      className="fixed inset-0"
      onDragOver={(e) => {
        if (screen === "hangar") e.preventDefault();
      }}
      onDrop={onDrop}
    >
      <SceneBoundary>
        <Canvas shadows dpr={[1, 1.75]} camera={{ fov: 42, position: [8, 6, 14], near: 0.1, far: 6000 }} gl={{ antialias: true }}>
          <ReadySignal wrapper={wrapper} />
          <Suspense fallback={null}>
            {screen === "hub" && <HubScene />}
            {screen === "hangar" && <HangarScene />}
            {screen === "console" && <ConsoleScene />}
            {(screen === "flight" || screen === "debrief") && <FlightScene />}
          </Suspense>
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
