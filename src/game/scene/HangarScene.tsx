import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useGame, type StackPart } from "../store";
import { dragState } from "../runtime";
import { getPart } from "../sim/parts";
import { PartMesh, layoutStack } from "./PartMesh";
import { Pad, MOUNT_Y } from "./Pad";
import { StudioLighting } from "./Lighting";
import { sceneRefs } from "./sceneRefs";

const TMP = new THREE.Vector3();

function stackWithout(stack: StackPart[], uid: string | null) {
  return uid ? stack.filter((p) => p.uid !== uid) : stack;
}

function stackTopY(stack: StackPart[]) {
  return stack.reduce((a, p) => a + getPart(p.partId).height, MOUNT_Y);
}

function PartInstance({ item, interactive }: { item: StackPart; interactive: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const h = getPart(item.partId).height;
  const startDrag = useGame((s) => s.startDrag);
  const removeLoose = useGame((s) => s.removeLoose);
  const init = useRef(false);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const st = useGame.getState();
    const target = TMP;
    let k = 12;
    if (dragState.uid === item.uid) {
      const st2 = stackWithout(st.stack, item.uid);
      if (dragState.snap === "top") target.set(0, stackTopY(st2) + h / 2, 0);
      else if (dragState.snap === "bottom") target.set(0, MOUNT_Y + h / 2, 0);
      else target.set(dragState.pos.x, dragState.pos.y, dragState.pos.z);
      k = 22;
    } else {
      const stack = stackWithout(st.stack, dragState.uid);
      const i = stack.findIndex((p) => p.uid === item.uid);
      if (i >= 0) {
        const lift = dragState.snap === "bottom" && dragState.partId ? getPart(dragState.partId).height : 0;
        const ys = layoutStack(stack.map((p) => p.partId), MOUNT_Y + lift);
        target.set(0, ys[i]!, 0);
      } else {
        const l = st.loose.find((p) => p.uid === item.uid);
        if (l) target.set(l.x, h / 2, l.z);
      }
    }
    if (!init.current) {
      g.position.copy(target);
      init.current = true;
    }
    g.position.lerp(target, 1 - Math.exp(-k * Math.min(delta, 0.05)));
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    const g = ref.current;
    if (!g) return;
    dragState.uid = item.uid;
    dragState.partId = item.partId;
    dragState.pos = { x: g.position.x, y: g.position.y, z: g.position.z };
    dragState.snap = null;
    startDrag(item.uid);
  };

  return (
    <group
      ref={ref}
      onPointerDown={onDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (useGame.getState().loose.some((l) => l.uid === item.uid)) removeLoose(item.uid);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = interactive ? "grab" : "not-allowed";
      }}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <PartMesh partId={item.partId} />
    </group>
  );
}

/** Glowing attachment rings at the stack's open ends. */
function Nodes() {
  const top = useRef<THREE.Mesh>(null);
  const bottom = useRef<THREE.Mesh>(null);
  const topMat = useRef<THREE.MeshBasicMaterial>(null);
  const botMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    const st = useGame.getState();
    const stack = stackWithout(st.stack, dragState.uid);
    const dragging = !!dragState.uid;
    const lift = dragState.snap === "bottom" && dragState.partId ? getPart(dragState.partId).height : 0;
    const pulse = 0.85 + Math.sin(state.clock.elapsedTime * 5) * 0.15;
    if (top.current && topMat.current) {
      top.current.position.set(0, stackTopY(stack) + lift + 0.02, 0);
      top.current.scale.setScalar(dragState.snap === "top" ? 1.25 : pulse);
      topMat.current.opacity = dragging ? (dragState.snap === "top" ? 1 : 0.75) : 0.3;
      topMat.current.color.set(dragState.snap === "top" ? "#7dffb0" : "#ff9a3c");
    }
    if (bottom.current && botMat.current) {
      bottom.current.visible = stack.length > 0;
      bottom.current.position.set(0, MOUNT_Y + 0.02, 0);
      bottom.current.scale.setScalar(dragState.snap === "bottom" ? 1.35 : pulse * 1.1);
      botMat.current.opacity = dragging ? (dragState.snap === "bottom" ? 1 : 0.75) : 0.25;
      botMat.current.color.set(dragState.snap === "bottom" ? "#7dffb0" : "#ff9a3c");
    }
  });
  return (
    <>
      <mesh ref={top} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.95, 0.05, 10, 48]} />
        <meshBasicMaterial ref={topMat} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={bottom} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.05, 0.05, 10, 48]} />
        <meshBasicMaterial ref={botMat} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </>
  );
}

/** Handles pointer move/up for dragging on a camera-facing vertical plane. */
function DragController() {
  const { camera, gl } = useThree();
  const draggingUid = useGame((s) => s.draggingUid);
  useEffect(() => {
    sceneRefs.camera = camera;
    sceneRefs.dom = gl.domElement;
  }, [camera, gl]);

  useEffect(() => {
    if (!draggingUid) return;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane();
    const hit = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const P = new THREE.Vector3();
    const startPos = new THREE.Vector3(dragState.pos.x, dragState.pos.y, dragState.pos.z);
    camera.getWorldDirection(normal);
    normal.y = 0;
    normal.normalize().negate();
    plane.setFromNormalAndCoplanarPoint(normal, startPos);
    document.body.style.cursor = "grabbing";

    let moved = false;
    const move = (e: PointerEvent) => {
      moved = true;
      const r = gl.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(plane, hit)) return;
      const partId = dragState.partId!;
      const h = getPart(partId).height;
      const y = Math.max(h / 2, hit.y);
      dragState.pos = { x: hit.x, y, z: hit.z };
      const st = useGame.getState();
      const stack = stackWithout(st.stack, draggingUid);
      // Snap in screen space: what the player sees lining up is what counts.
      const px = (x: number, yy: number, z: number) => {
        P.set(x, yy, z).project(camera);
        return [((P.x + 1) / 2) * r.width, ((1 - P.y) / 2) * r.height] as const;
      };
      const dist = (a: readonly [number, number], b: readonly [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      const topY = stackTopY(stack);
      const partBottom = px(hit.x, y - h / 2, hit.z);
      const partCenter = px(hit.x, y, hit.z);
      let snap: typeof dragState.snap = null;
      const SNAP_PX = Math.max(60, r.height * 0.08);
      if (dist(partBottom, px(0, topY, 0)) < SNAP_PX) snap = "top";
      else if (stack.length > 0 && dist(partCenter, px(0, MOUNT_Y + h / 2, 0)) < SNAP_PX) snap = "bottom";
      dragState.snap = snap;
    };
    const up = () => {
      const st = useGame.getState();
      const uid = draggingUid;
      if (!moved) useGame.setState({ draggingUid: null });
      else if (dragState.snap) st.attach(uid, dragState.snap);
      else {
        // Keep loose parts clear of the mount.
        let { x, z } = dragState.pos;
        if (Math.abs(x) < 1.6 && Math.abs(z) < 1.6) x = x < 0 ? -2.4 : 2.4;
        st.dropLoose(uid, x, z);
      }
      dragState.uid = null;
      dragState.partId = null;
      dragState.snap = null;
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [draggingUid, camera, gl]);
  return null;
}

export function HangarScene() {
  const stack = useGame((s) => s.stack);
  const loose = useGame((s) => s.loose);
  const draggingUid = useGame((s) => s.draggingUid);
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(8, 6.5, 14);
  }, [camera]);

  const items = useMemo(() => {
    const all: { item: StackPart; interactive: boolean }[] = [];
    stack.forEach((p, i) => all.push({ item: p, interactive: i === 0 || i === stack.length - 1 }));
    loose.forEach((p) => all.push({ item: p, interactive: true }));
    return all.sort((a, b) => a.item.uid.localeCompare(b.item.uid));
  }, [stack, loose]);

  return (
    <>
      <color attach="background" args={["#0d1015"]} />
      <fog attach="fog" args={["#0d1015", 22, 60]} />
      <StudioLighting />
      <Pad />
      <Nodes />
      {items.map(({ item, interactive }) => (
        <PartInstance key={item.uid} item={item} interactive={interactive} />
      ))}
      <DragController />
      <OrbitControls
        makeDefault
        enabled={!draggingUid}
        target={[0, 3, 0]}
        enablePan={false}
        minDistance={8}
        maxDistance={26}
        minPolarAngle={0.5}
        maxPolarAngle={1.45}
      />
    </>
  );
}
