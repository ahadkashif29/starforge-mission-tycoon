import { getPart, type EnginePart, type PartDef, type TankPart, type PodPart } from "./parts";

export const G0 = 9.81;

export interface StageInfo {
  /** Indices into the stack (top = 0). */
  partIndices: number[];
  engine: EnginePart;
  tanks: TankPart[];
  fuelMass: number; // tonnes at the chosen load
  dryMass: number; // tonnes, engine + tank dry
  deltaV: number; // m/s, ideal vacuum
  twr: number; // at ignition, full throttle
  burnTime: number; // seconds at full throttle
}

export interface BuildAnalysis {
  valid: boolean;
  errors: string[];
  pod: PodPart | null;
  /** Bottom stage first (fires first). */
  stages: StageInfo[];
  totalMass: number; // tonnes, wet
  dryMass: number;
  liftoffThrust: number; // kN
  liftoffTwr: number;
  deltaV: number; // m/s ideal
  cost: number;
}

export function analyzeBuild(stack: string[], fuelLoad = 1): BuildAnalysis {
  const parts: PartDef[] = stack.map(getPart);
  const errors: string[] = [];
  const load = Math.max(0, Math.min(1, fuelLoad));

  if (parts.length === 0) errors.push("The launch mount is empty.");
  const podIdx = parts.map((p, i) => (p.category === "pod" ? i : -1)).filter((i) => i >= 0);
  if (podIdx.length === 0 && parts.length > 0) errors.push("Add a command pod or probe core on top.");
  if (podIdx.length > 1) errors.push("Only one command pod per rocket.");
  if (podIdx.length === 1 && podIdx[0] !== 0) errors.push("The command pod must be the top-most part.");
  const engineCount = parts.filter((p) => p.category === "engine").length;
  if (parts.length > 0 && engineCount === 0) errors.push("Add at least one engine.");
  const last = parts[parts.length - 1];
  if (last && last.category !== "engine" && engineCount > 0) errors.push("The bottom part must be an engine.");

  // Build stages: each engine plus the tanks directly above it (up to the previous engine or pod).
  const stagesTopFirst: { idx: number[]; engine: EnginePart; tanks: TankPart[] }[] = [];
  let current: number[] = [];
  parts.forEach((p, i) => {
    if (p.category === "pod") return;
    current.push(i);
    if (p.category === "engine") {
      const tanks = current.map((j) => parts[j]!).filter((x): x is TankPart => x.category === "tank");
      if (tanks.length === 0) errors.push(`${p.name} has no fuel tank feeding it.`);
      stagesTopFirst.push({ idx: current, engine: p, tanks });
      current = [];
    }
  });

  const pod = (parts[0]?.category === "pod" ? parts[0] : null) as PodPart | null;
  const payload = pod?.mass ?? 0;

  // Compute dV bottom-up: the bottom stage carries everything above it.
  const stagesBottomFirst = [...stagesTopFirst].reverse();
  const stages: StageInfo[] = [];
  const wetOf = (s: (typeof stagesTopFirst)[number]) =>
    s.engine.mass + s.tanks.reduce((a, t) => a + t.mass + t.fuel * load, 0);
  stagesBottomFirst.forEach((s, k) => {
    const above = stagesBottomFirst.slice(k + 1).reduce((a, x) => a + wetOf(x), 0);
    const fuelMass = s.tanks.reduce((a, t) => a + t.fuel * load, 0);
    const dryMass = s.engine.mass + s.tanks.reduce((a, t) => a + t.mass, 0);
    const m0 = payload + above + dryMass + fuelMass;
    const mf = m0 - fuelMass;
    const deltaV = mf > 0 ? s.engine.isp * G0 * Math.log(m0 / mf) : 0;
    const twr = m0 > 0 ? (s.engine.thrust * 1000) / (m0 * 1000 * G0) : 0;
    const mdot = (s.engine.thrust * 1000) / (s.engine.isp * G0); // kg/s
    stages.push({
      partIndices: s.idx,
      engine: s.engine,
      tanks: s.tanks,
      fuelMass,
      dryMass,
      deltaV,
      twr,
      burnTime: (fuelMass * 1000) / mdot,
    });
  });

  const totalMass = parts.reduce((a, p) => a + p.mass + (p.category === "tank" ? p.fuel * load : 0), 0);
  const dryMass = parts.reduce((a, p) => a + p.mass, 0);
  const bottom = stages[0];
  const liftoffThrust = bottom ? bottom.engine.thrust : 0;
  const liftoffTwr = totalMass > 0 ? liftoffThrust / (totalMass * G0) : 0;
  const cost = parts.reduce((a, p) => a + p.cost, 0);

  return {
    valid: errors.length === 0,
    errors,
    pod,
    stages,
    totalMass,
    dryMass,
    liftoffThrust,
    liftoffTwr,
    deltaV: stages.reduce((a, s) => a + s.deltaV, 0),
    cost,
  };
}

/** Fraction of thrust that turns into useful velocity for a given launch angle. */
export function trajectoryEfficiency(angle: number, optimal: number): number {
  const off = Math.abs(angle - optimal);
  return Math.max(0.3, 1 - 0.55 * (off / 40) ** 2);
}
