// Part catalog. Pure data: masses in tonnes, thrust in kN, Isp in seconds, heights in scene units.
export type PartCategory = "pod" | "tank" | "engine";

export interface PartBase {
  id: string;
  name: string;
  category: PartCategory;
  description: string;
  /** Dry mass in tonnes. */
  mass: number;
  /** Cost to place on a launched rocket. */
  cost: number;
  /** Coins needed to unlock. 0 = unlocked from the start. */
  unlockCost: number;
  /** Visual height in scene units (drives node positions). */
  height: number;
  /** Visual style key for the procedural mesh. */
  look: string;
}

export interface PodPart extends PartBase {
  category: "pod";
  /** Lateral RCS authority multiplier. */
  rcs: number;
  /** Structural rating; higher tolerates more Max-Q stress. */
  structure: number;
}

export interface TankPart extends PartBase {
  category: "tank";
  /** Fuel mass at 100% load, tonnes. */
  fuel: number;
}

export interface EnginePart extends PartBase {
  category: "engine";
  thrust: number;
  isp: number;
}

export type PartDef = PodPart | TankPart | EnginePart;

export const PARTS: PartDef[] = [
  {
    id: "pod-kestrel", name: "Kestrel Pod", category: "pod", look: "kestrel",
    description: "Reliable two-seat capsule. Balanced RCS and hull.",
    mass: 1.4, cost: 80, unlockCost: 0, height: 1.3, rcs: 1, structure: 1,
  },
  {
    id: "pod-atlas", name: "Atlas Command Module", category: "pod", look: "atlas",
    description: "Heavy reinforced hull. Strong RCS jets, survives harder Max-Q.",
    mass: 2.4, cost: 200, unlockCost: 700, height: 1.6, rcs: 1.6, structure: 1.5,
  },
  {
    id: "pod-vanguard", name: "Vanguard Probe Core", category: "pod", look: "probe",
    description: "Featherweight uncrewed core. Ideal for deep-space payloads.",
    mass: 0.6, cost: 150, unlockCost: 1200, height: 1.0, rcs: 0.8, structure: 0.9,
  },
  {
    id: "tank-s", name: "FT-200 Tank", category: "tank", look: "tank-s",
    description: "Compact tank for fine-tuning a stage.",
    mass: 0.25, cost: 50, unlockCost: 0, height: 0.9, fuel: 2,
  },
  {
    id: "tank-m", name: "FT-400 Tank", category: "tank", look: "tank-m",
    description: "The workhorse. Good fuel-to-dry-mass ratio.",
    mass: 0.45, cost: 90, unlockCost: 0, height: 1.5, fuel: 4,
  },
  {
    id: "tank-l", name: "FT-800 Tank", category: "tank", look: "tank-l",
    description: "Massive booster tank for heavy lower stages.",
    mass: 0.8, cost: 150, unlockCost: 600, height: 2.4, fuel: 7,
  },
  {
    id: "eng-spark", name: "LV-30 Spark", category: "engine", look: "spark",
    description: "Light general-purpose engine.",
    mass: 0.6, cost: 100, unlockCost: 0, height: 1.0, thrust: 160, isp: 300,
  },
  {
    id: "eng-mammoth", name: "LV-90 Mammoth", category: "engine", look: "mammoth",
    description: "High-thrust lifter for heavy first stages.",
    mass: 1.6, cost: 220, unlockCost: 800, height: 1.3, thrust: 360, isp: 280,
  },
  {
    id: "eng-wisp", name: "NV-4 Wisp", category: "engine", look: "wisp",
    description: "Vacuum-optimized. Very efficient, very low thrust.",
    mass: 0.5, cost: 260, unlockCost: 1400, height: 1.1, thrust: 60, isp: 420,
  },
  {
    id: "eng-titan", name: "TX-700 Titan Cluster", category: "engine", look: "titan",
    description: "Triple-bell monster. Lifts anything off the pad.",
    mass: 2.8, cost: 400, unlockCost: 2000, height: 1.4, thrust: 700, isp: 270,
  },
];

export const PART_MAP: Record<string, PartDef> = Object.fromEntries(PARTS.map((p) => [p.id, p]));

export const STARTER_UNLOCKS = PARTS.filter((p) => p.unlockCost === 0).map((p) => p.id);

export function getPart(id: string): PartDef {
  const p = PART_MAP[id];
  if (!p) throw new Error(`Unknown part ${id}`);
  return p;
}

/** Radius of every stack body, so all parts mate on the same attachment ring. */
export const STACK_RADIUS = 0.75;
