import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../store";
import { flightInput, flightRuntime } from "../runtime";
import { createFlight, predict, stepFlight, progress, type FlightState, type Prediction } from "../sim/flight";
import { computePayout } from "../sim/economy";
import { MISSION_MAP } from "../sim/missions";
import { getPart } from "../sim/parts";
import { PartMesh, layoutStack } from "./PartMesh";
import { Pad, MOUNT_Y } from "./Pad";
import { planetTexture, rockTexture } from "./textures";
import { beep, boom, setEngine } from "../audio";

/** Visual (scene-space) state derived from the sim each frame. */
interface Visual {
  worldOffset: THREE.Vector3;
  worldVel: THREE.Vector3;
  pitch: number;
  heading: THREE.Vector3;
  right: THREE.Vector3;
  rocketPos: THREE.Vector3;
  shake: number;
  height: number;
  approachT: number;
  planetPos: THREE.Vector3;
  failPos: THREE.Vector3;
}

const SKY_LOW = new THREE.Color("#6f9fd4");
const SKY_HIGH = new THREE.Color("#030509");
const TMP = new THREE.Vector3();
const TMP2 = new THREE.Vector3();

function smooth(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function FlightScene() {
  const stackIds = useMemo(() => useGame.getState().stack.map((p) => p.partId), []);
  const { sim, prediction } = useMemo(() => {
    const st = useGame.getState();
    const mission = MISSION_MAP[st.missionId]!;
    const sim = createFlight(stackIds, mission, st.fuelLoad, st.angle);
    const prediction = predict(stackIds, mission, st.fuelLoad, st.angle);
    return { sim, prediction };
  }, [stackIds]);
  const ys = useMemo(() => layoutStack(stackIds, 0), [stackIds]);
  const height = useMemo(() => stackIds.reduce((a, id) => a + getPart(id).height, 0), [stackIds]);
  const v = useMemo<Visual>(
    () => ({
      worldOffset: new THREE.Vector3(),
      worldVel: new THREE.Vector3(),
      pitch: 0,
      heading: new THREE.Vector3(0, 1, 0),
      right: new THREE.Vector3(1, 0, 0),
      rocketPos: new THREE.Vector3(),
      shake: 0,
      height,
      approachT: 0,
      planetPos: new THREE.Vector3(),
      failPos: new THREE.Vector3(),
    }),
    [height],
  );
  const [boomed, setBoomed] = useState(false);
  const [approach, setApproach] = useState(false);
  const missionId = sim.missionId;

  useEffect(() => {
    flightRuntime.state = sim;
    flightRuntime.finished = false;
    flightInput.throttle = 1;
    flightInput.separateRequested = false;
    return () => {
      setEngine(0);
    };
  }, [sim]);

  return (
    <>
      <Stepper sim={sim} prediction={prediction} v={v} onBoom={() => setBoomed(true)} onApproach={() => setApproach(true)} />
      <SkyAndLights v={v} />
      <World v={v} />
      {!boomed && <RocketStages sim={sim} ids={stackIds} ys={ys} v={v} />}
      {boomed && <Explosion sim={sim} ids={stackIds} ys={ys} v={v} />}
      <Smoke sim={sim} ids={stackIds} ys={ys} v={v} />
      <Asteroid sim={sim} v={v} />
      {approach && <TargetPlanet missionId={missionId} v={v} />}
      <CameraRig sim={sim} v={v} />
    </>
  );
}

function Stepper({ sim, prediction, v, onBoom, onApproach }: { sim: FlightState; prediction: Prediction; v: Visual; onBoom: () => void; onApproach: () => void }) {
  const last = useRef({ phase: sim.phase, maxQ: false, ast: sim.asteroid.state, active: 0, burnout: false });
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const lateral = Math.max(-1, Math.min(1, (flightInput.right ? 1 : 0) - (flightInput.left ? 1 : 0) + flightInput.touchLateral));
    stepFlight(sim, dt, { throttle: flightInput.throttle, lateral, separate: flightInput.separateRequested });
    flightInput.separateRequested = false;

    // Visual derivation
    const p = progress(sim);
    const targetPitch = THREE.MathUtils.degToRad(90 - sim.angle);
    v.pitch = targetPitch * smooth(0.03, 0.45, p);
    v.heading.set(Math.sin(v.pitch), Math.cos(v.pitch), 0);
    v.right.set(Math.cos(v.pitch), -Math.sin(v.pitch), 0);
    v.rocketPos.copy(v.right).multiplyScalar(sim.lateralX);
    const flying = sim.phase === "ascent" && sim.lifted;
    const speed = flying ? 2 + sim.velocity / 50 : sim.phase === "approach" ? 25 * (1 - v.approachT) : 0;
    v.worldVel.copy(v.heading).multiplyScalar(-speed);
    v.worldOffset.addScaledVector(v.worldVel, dt);

    // Engine sound
    const st = sim.stages[sim.active];
    const burning = flying && !!st && st.fuel > 0;
    setEngine(burning ? 0.25 + sim.throttle * 0.75 : sim.phase === "ascent" && !sim.lifted ? 0.9 : 0);

    // Events -> sound/visual triggers
    const L = last.current;
    if (sim.phase === "exploding" && L.phase !== "exploding") {
      v.failPos.copy(v.rocketPos).addScaledVector(v.heading, v.height * 0.5);
      v.shake = 1.4;
      boom(true);
      onBoom();
    }
    if (sim.phase === "approach" && L.phase !== "approach") {
      v.planetPos.copy(v.heading).multiplyScalar(900).addScaledVector(v.right, -120);
      beep(660, 0.25, "sine", 0.15);
      setTimeout(() => beep(990, 0.4, "sine", 0.15), 220);
      onApproach();
    }
    if (sim.inMaxQ && !L.maxQ) beep(520, 0.15);
    if (sim.asteroid.state === "incoming" && L.ast !== "incoming") {
      beep(980, 0.12);
      setTimeout(() => beep(980, 0.12), 200);
      setTimeout(() => beep(980, 0.12), 400);
    }
    if (sim.active !== L.active) {
      boom(false);
      v.shake = Math.max(v.shake, 0.35);
    }
    const spent = !!st && st.fuel <= 0 && sim.active < sim.stages.length - 1;
    if (spent && !L.burnout) beep(740, 0.3, "sawtooth", 0.1);
    if (sim.phase === "ascent" && !sim.lifted) v.shake = Math.max(v.shake, 0.08);
    if (flying && p < 0.08) v.shake = Math.max(v.shake, 0.06 * sim.throttle);
    if (sim.phase === "approach") v.approachT = Math.min(1, v.approachT + dt / 6);
    L.phase = sim.phase;
    L.maxQ = sim.inMaxQ;
    L.ast = sim.asteroid.state;
    L.active = sim.active;
    L.burnout = spent;

    if (sim.phase === "done" && !flightRuntime.finished) {
      flightRuntime.finished = true;
      const mission = MISSION_MAP[sim.missionId]!;
      useGame.getState().finishMission({ missionId: sim.missionId, flight: sim, prediction, payout: computePayout(mission, sim) });
    }
  }, -1);
  return null;
}

function SkyAndLights({ v }: { v: Visual }) {
  const { scene } = useThree();
  const bg = useMemo(() => new THREE.Color(), []);
  const fog = useMemo(() => new THREE.Fog("#6f9fd4", 60, 700), []);
  const stars = useRef<THREE.Group>(null);
  useEffect(() => {
    scene.background = bg;
    scene.fog = fog;
    return () => {
      scene.background = null;
      scene.fog = null;
    };
  }, [scene, bg, fog]);
  useFrame(() => {
    const alt = Math.max(0, -v.worldOffset.y);
    const t = smooth(0, 160, alt);
    bg.copy(SKY_LOW).lerp(SKY_HIGH, t);
    fog.color.copy(bg);
    fog.far = 700 + t * 4000;
    if (stars.current) stars.current.visible = t > 0.35;
  });
  return (
    <>
      <hemisphereLight args={["#cfdcf0", "#3a3028", 0.7]} />
      <directionalLight position={[40, 60, 30]} intensity={2.6} color="#fff2df" />
      <directionalLight position={[-30, -10, 20]} intensity={0.35} color="#6e8fc4" />
      <group ref={stars}>
        <Stars radius={400} depth={200} count={3500} factor={8} saturation={0.2} fade speed={0.3} />
      </group>
    </>
  );
}

function World({ v }: { v: Visual }) {
  const ref = useRef<THREE.Group>(null);
  const earthMap = useMemo(() => planetTexture("earth"), []);
  const clouds = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        pos: [(Math.random() - 0.3) * 160, 25 + Math.random() * 60, -20 - Math.random() * 60 + (i % 3 === 0 ? 50 : 0)] as [number, number, number],
        s: 6 + Math.random() * 10,
      })),
    [],
  );
  useFrame(() => ref.current?.position.copy(v.worldOffset));
  return (
    <group ref={ref}>
      <group position={[0, -MOUNT_Y, 0]}>
        <Pad />
      </group>
      <mesh position={[0, -400.95, 0]}>
        <sphereGeometry args={[400, 96, 64]} />
        <meshStandardMaterial map={earthMap} roughness={0.9} />
      </mesh>
      <mesh position={[0, -400.95, 0]}>
        <sphereGeometry args={[412, 64, 48]} />
        <meshBasicMaterial color="#7fb2ff" transparent opacity={0.18} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {clouds.map((c, i) => (
        <mesh key={i} position={c.pos} scale={[c.s, c.s * 0.25, c.s * 0.6]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#f4f6fa" roughness={1} transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Flame({ sim, stageIndex, y, size }: { sim: FlightState; stageIndex: number; y: number; size: number }) {
  const g = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    const st = sim.stages[stageIndex];
    const on = sim.active === stageIndex && !!st && st.fuel > 0 && sim.phase === "ascent";
    const thr = sim.lifted ? sim.throttle : 0.7;
    const f = on ? thr : 0;
    if (g.current) {
      g.current.visible = f > 0.02;
      const flick = 1 + Math.sin(state.clock.elapsedTime * 47) * 0.06 + Math.sin(state.clock.elapsedTime * 31) * 0.05;
      const len = (1.2 + f * 3.2 + progress(sim) * 2) * flick;
      g.current.scale.set(size * (0.8 + f * 0.3), len, size * (0.8 + f * 0.3));
    }
    if (light.current) light.current.intensity = f * 40;
  });
  return (
    <group position={[0, y, 0]}>
      <group ref={g}>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.42, 0.06, 1, 20, 1, true]} />
          <meshBasicMaterial color="#ff8a2a" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.32, 0]} scale={[0.55, 0.64, 0.55]}>
          <cylinderGeometry args={[0.42, 0.04, 1, 16, 1, true]} />
          <meshBasicMaterial color="#fff1c4" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <pointLight ref={light} position={[0, -1.2, 0]} color="#ffa04a" distance={18} decay={1.6} />
    </group>
  );
}

function engineSize(id: string) {
  const look = getPart(id).look;
  return look === "titan" ? 1.7 : look === "mammoth" ? 1.5 : look === "wisp" ? 0.8 : 1.05;
}

function RocketStages({ sim, ids, ys, v }: { sim: FlightState; ids: string[]; ys: number[]; v: Visual }) {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const detached = useRef(sim.stages.map(() => ({ done: false, vel: new THREE.Vector3(), spin: 0 })));
  const payloadRef = useRef<THREE.Group>(null);
  const staged = new Set(sim.stages.flatMap((s) => s.partIndices));
  const payload = ids.map((_, i) => i).filter((i) => !staged.has(i));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const place = (g: THREE.Group) => {
      g.position.copy(v.rocketPos);
      g.rotation.set(0, 0, -v.pitch);
    };
    if (payloadRef.current) place(payloadRef.current);
    sim.stages.forEach((st, k) => {
      const g = groups.current[k];
      if (!g) return;
      const d = detached.current[k]!;
      if (st.attached) return place(g);
      if (!d.done) {
        d.done = true;
        d.vel.copy(v.heading).multiplyScalar(-2.5).addScaledVector(v.right, (k % 2 ? 1 : -1) * 0.8);
        d.spin = (k % 2 ? 1 : -1) * 0.6;
      }
      d.vel.y -= 1.5 * dt;
      g.position.addScaledVector(v.worldVel, dt).addScaledVector(d.vel, dt);
      g.rotation.z += d.spin * dt;
      g.rotation.x += d.spin * 0.4 * dt;
    });
  });

  return (
    <>
      <group ref={payloadRef}>
        {payload.map((i) => (
          <group key={i} position={[0, ys[i]!, 0]}>
            <PartMesh partId={ids[i]!} />
          </group>
        ))}
      </group>
      {sim.stages.map((st, k) => {
        const engineIdx = st.partIndices[st.partIndices.length - 1]!;
        const eh = getPart(ids[engineIdx]!).height;
        return (
          <group key={k} ref={(el) => { groups.current[k] = el; }}>
            {st.partIndices.map((i) => (
              <group key={i} position={[0, ys[i]!, 0]}>
                <PartMesh partId={ids[i]!} />
              </group>
            ))}
            <Flame sim={sim} stageIndex={k} y={ys[engineIdx]! - eh / 2} size={engineSize(ids[engineIdx]!)} />
          </group>
        );
      })}
    </>
  );
}

const SMOKE_N = 110;
function Smoke({ sim, ids, ys, v }: { sim: FlightState; ids: string[]; ys: number[]; v: Visual }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const parts = useMemo(() => Array.from({ length: SMOKE_N }, () => ({ p: new THREE.Vector3(), vel: new THREE.Vector3(), age: 99, life: 1, s: 1 })), []);
  const acc = useRef(0);
  const cursor = useRef(0);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const st = sim.stages[sim.active];
    const burning = sim.phase === "ascent" && !!st && st.fuel > 0;
    const alt = -v.worldOffset.y;
    if (burning) {
      acc.current += dt * (alt < 120 ? 40 : 14);
      const engineIdx = st.partIndices[st.partIndices.length - 1]!;
      const nozzleY = ys[engineIdx]! - getPart(ids[engineIdx]!).height / 2 - 0.8;
      while (acc.current >= 1) {
        acc.current -= 1;
        const pp = parts[cursor.current++ % SMOKE_N]!;
        pp.p.copy(v.rocketPos).addScaledVector(v.heading, nozzleY - Math.random() * 1.5);
        pp.vel.copy(v.worldVel).addScaledVector(v.heading, -6 * (sim.lifted ? sim.throttle : 0.2)).add(TMP.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 3));
        if (!sim.lifted) pp.vel.set((Math.random() - 0.5) * 10, Math.random() * 1.5, (Math.random() - 0.5) * 10);
        pp.age = 0;
        pp.life = alt < 120 ? 2.4 : 1.1;
        pp.s = alt < 120 ? 1 : 0.45;
      }
    }
    if (!mesh.current) return;
    parts.forEach((pp, i) => {
      pp.age += dt;
      let s = 0;
      if (pp.age < pp.life) {
        pp.p.addScaledVector(pp.vel, dt);
        pp.vel.multiplyScalar(Math.exp(-0.6 * dt));
        const t = pp.age / pp.life;
        s = pp.s * (0.6 + t * 3.2) * (1 - t * t);
      }
      sc.setScalar(s);
      m.compose(pp.p, q, sc);
      mesh.current!.setMatrixAt(i, m);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, SMOKE_N]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshStandardMaterial color="#cfccc6" roughness={1} transparent opacity={0.55} depthWrite={false} />
    </instancedMesh>
  );
}

function Asteroid({ sim, v }: { sim: FlightState; v: Visual }) {
  const ref = useRef<THREE.Group>(null);
  const passT = useRef(0);
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 3);
    const pos = g.attributes.position!;
    const vec = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      vec.fromBufferAttribute(pos, i);
      const n = Math.sin(vec.x * 3.1) * Math.cos(vec.y * 2.7) * Math.sin(vec.z * 3.7);
      vec.multiplyScalar(1 + n * 0.28 + Math.sin(vec.x * 9) * 0.04);
      pos.setXYZ(i, vec.x, vec.y, vec.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const map = useMemo(() => rockTexture(), []);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const a = sim.asteroid;
    g.visible = a.state === "incoming" || (a.state === "passed" && passT.current < 3) || (a.state === "hit" && false);
    if (a.state === "passed") passT.current += Math.min(delta, 0.05);
    const dist = a.state === "incoming" ? a.timeToImpact * 14 : -passT.current * 14;
    g.position.copy(v.rocketPos).sub(TMP2.copy(v.right).multiplyScalar(sim.lateralX)).addScaledVector(v.heading, dist + v.height * 0.5).addScaledVector(v.right, a.laneX);
    g.position.z = 0;
    g.rotation.x += delta * 0.9;
    g.rotation.y += delta * 0.6;
  });
  return (
    <group ref={ref} visible={false} scale={1.1}>
      <mesh geometry={geo}>
        <meshStandardMaterial map={map} roughness={0.95} metalness={0.05} flatShading />
      </mesh>
      <pointLight color="#ff5533" intensity={6} distance={6} />
    </group>
  );
}

function Explosion({ sim, ids, ys, v }: { sim: FlightState; ids: string[]; ys: number[]; v: Visual }) {
  const attached = useMemo(() => {
    const out: number[] = [];
    const staged = new Set(sim.stages.flatMap((s) => s.partIndices));
    ids.forEach((_, i) => {
      if (!staged.has(i)) out.push(i);
    });
    sim.stages.forEach((s) => s.attached && out.push(...s.partIndices));
    return out;
  }, [sim, ids]);
  const frags = useMemo(
    () =>
      attached.map((i) => {
        const pos = new THREE.Vector3().copy(v.rocketPos).addScaledVector(v.heading, ys[i]!);
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 - 0.1, Math.random() - 0.5).normalize();
        return { i, pos, vel: dir.multiplyScalar(6 + Math.random() * 10), rot: new THREE.Euler(0, 0, -v.pitch), spin: new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8) };
      }),
    [attached, v, ys],
  );
  const balls = useMemo(
    () =>
      Array.from({ length: 12 }, (_, k) => ({
        off: new THREE.Vector3((Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * v.height * 0.8, (Math.random() - 0.5) * 2.5),
        delay: k * 0.05 + Math.random() * 0.15,
        size: 1.8 + Math.random() * 2.6,
        color: k % 3 === 0 ? "#fff3c8" : k % 3 === 1 ? "#ffb347" : "#ff5a1a",
      })),
    [v],
  );
  const fragRefs = useRef<(THREE.Group | null)[]>([]);
  const ballRefs = useRef<(THREE.Mesh | null)[]>([]);
  const smokeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ring = useRef<THREE.Mesh>(null);
  const flash = useRef<THREE.PointLight>(null);
  const sparks = useRef<THREE.InstancedMesh>(null);
  const sparkData = useMemo(
    () => Array.from({ length: 140 }, () => ({ p: new THREE.Vector3().copy(v.failPos), vel: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.4, Math.random() - 0.5).normalize().multiplyScalar(14 + Math.random() * 26), life: 0.8 + Math.random() * 1.2 })),
    [v],
  );
  const t = useRef(0);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    t.current += dt;
    const T = t.current;
    frags.forEach((f, k) => {
      f.vel.y -= 6 * dt;
      f.pos.addScaledVector(f.vel, dt);
      f.rot.x += f.spin.x * dt;
      f.rot.y += f.spin.y * dt;
      f.rot.z += f.spin.z * dt;
      const g = fragRefs.current[k];
      if (g) {
        g.position.copy(f.pos);
        g.rotation.copy(f.rot);
      }
    });
    balls.forEach((b, k) => {
      const mesh = ballRefs.current[k];
      if (!mesh) return;
      const lt = Math.max(0, T - b.delay);
      const s = b.size * (1 - Math.exp(-lt * 5)) * (1 + lt * 0.4);
      mesh.position.copy(v.failPos).add(b.off).addScaledVector(TMP.set(0, 1, 0), lt * 1.2);
      mesh.scale.setScalar(Math.max(0.001, s));
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - lt / 1.6);
    });
    smokeRefs.current.forEach((mesh, k) => {
      if (!mesh) return;
      const lt = Math.max(0, T - 0.3 - k * 0.08);
      const b = balls[k]!;
      mesh.position.copy(v.failPos).add(b.off).addScaledVector(TMP.set(0, 1, 0), lt * 0.8);
      mesh.scale.setScalar(Math.max(0.001, (b.size + 1) * (1 - Math.exp(-lt * 1.5))));
      (mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.8 - lt * 0.22);
    });
    if (ring.current) {
      ring.current.position.copy(v.failPos);
      ring.current.scale.setScalar(1 + T * 22);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - T * 0.9);
    }
    if (flash.current) {
      flash.current.position.copy(v.failPos);
      flash.current.intensity = Math.max(0, 400 * Math.exp(-T * 3));
    }
    if (sparks.current) {
      sparkData.forEach((s, i) => {
        let k = 0;
        if (T < s.life) {
          s.vel.multiplyScalar(Math.exp(-1.2 * dt));
          s.vel.y -= 5 * dt;
          s.p.addScaledVector(s.vel, dt);
          k = 0.14 * (1 - T / s.life);
        }
        sc.setScalar(k);
        m.compose(s.p, q, sc);
        sparks.current!.setMatrixAt(i, m);
      });
      sparks.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      {frags.map((f, k) => (
        <group key={f.i} ref={(el) => { fragRefs.current[k] = el; }}>
          <PartMesh partId={ids[f.i]!} />
        </group>
      ))}
      {balls.map((b, k) => (
        <mesh key={k} ref={(el) => { ballRefs.current[k] = el; }}>
          <sphereGeometry args={[1, 18, 14]} />
          <meshBasicMaterial color={b.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {balls.map((_, k) => (
        <mesh key={`s${k}`} ref={(el) => { smokeRefs.current[k] = el; }}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color="#2a2522" roughness={1} transparent depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.06, 8, 64]} />
        <meshBasicMaterial color="#ffd9a0" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <instancedMesh ref={sparks} args={[undefined, undefined, 140]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffc066" toneMapped={false} />
      </instancedMesh>
      <pointLight ref={flash} color="#ffb070" distance={120} decay={1.4} />
    </>
  );
}

function TargetPlanet({ missionId, v }: { missionId: string; v: Visual }) {
  const mission = MISSION_MAP[missionId]!;
  const map = useMemo(() => planetTexture(mission.planet), [mission.planet]);
  const ref = useRef<THREE.Group>(null);
  const start = useMemo(() => v.planetPos.clone(), [v]);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const e = 1 - Math.pow(1 - v.approachT, 3);
    g.position.copy(start).multiplyScalar(1 - e * 0.62);
    g.rotation.y += delta * 0.05;
  });
  const glow = mission.planet === "earth" ? "#8fc0ff" : mission.planet === "mars" ? "#ffae80" : "#bfeaff";
  return (
    <group ref={ref}>
      <mesh rotation={[0.2, 0, 0.3]}>
        <sphereGeometry args={[110, 96, 64]} />
        <meshStandardMaterial map={map} roughness={0.85} />
      </mesh>
      <mesh>
        <sphereGeometry args={[116, 64, 48]} />
        <meshBasicMaterial color={glow} transparent opacity={0.16} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {mission.planet === "ice" && (
        <mesh rotation={[1.2, 0.2, 0]}>
          <ringGeometry args={[150, 230, 128]} />
          <meshStandardMaterial color="#cfe6f0" transparent opacity={0.45} side={THREE.DoubleSide} roughness={1} />
        </mesh>
      )}
    </group>
  );
}

function CameraRig({ sim, v }: { sim: FlightState; v: Visual }) {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(0, 3, 0), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const shakeOff = useMemo(() => new THREE.Vector3(), []);
  const init = useRef(false);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.far = 6000;
    cam.updateProjectionMatrix();
    return () => {
      cam.far = 200;
      cam.updateProjectionMatrix();
    };
  }, [camera]);
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    camera.position.sub(shakeOff);
    const H = v.height;
    const center = TMP.copy(v.rocketPos).addScaledVector(v.heading, H * 0.55);
    const dist = 9 + H * 1.1;
    if (sim.phase === "countdown" || (sim.phase === "ascent" && !sim.lifted)) {
      pos.set(dist * 0.55, H * 0.25 + 1.5, dist * 0.9);
    } else if (sim.phase === "approach" || (sim.phase === "done" && sim.success)) {
      pos.copy(center).addScaledVector(v.heading, -dist * 1.2).add(TMP2.set(dist * 0.6, dist * 0.25, dist * 1.4));
    } else if (sim.phase === "exploding" || sim.phase === "done") {
      pos.copy(v.failPos).add(TMP2.set(dist * 1.1, dist * 0.3, dist * 1.6));
    } else {
      pos.copy(center).add(TMP2.set(dist * 0.45, -H * 0.15, dist)).addScaledVector(v.heading, -H * 0.2);
    }
    if (!init.current) {
      camera.position.copy(pos);
      init.current = true;
    }
    camera.position.lerp(pos, 1 - Math.exp(-2.5 * dt));
    let target = center;
    if (sim.phase === "approach" || (sim.phase === "done" && sim.success)) target = TMP2.copy(center).lerp(v.planetPos.clone().multiplyScalar(0.4), 0.25 * v.approachT);
    else if (sim.phase === "exploding" || (sim.phase === "done" && !sim.success)) target = v.failPos;
    look.lerp(target, 1 - Math.exp(-4 * dt));
    camera.lookAt(look);
    v.shake *= Math.exp(-2.5 * dt);
    const s = v.shake;
    const t = state.clock.elapsedTime;
    shakeOff.set(Math.sin(t * 53) * s, Math.sin(t * 61 + 1) * s, Math.sin(t * 47 + 2) * s * 0.5);
    camera.position.add(shakeOff);
  });
  return null;
}
