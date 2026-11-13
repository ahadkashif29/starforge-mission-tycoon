import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STARTER_UNLOCKS, getPart } from "./sim/parts";
import { START_COINS, GRANT_AMOUNT } from "./sim/economy";
import { analyzeBuild, type BuildAnalysis } from "./sim/rocket";
import type { FlightState, Prediction } from "./sim/flight";
import type { Payout } from "./sim/economy";

export type Screen = "hub" | "hangar" | "console" | "flight" | "debrief";

export interface StackPart {
  uid: string;
  partId: string;
}
export interface LoosePart extends StackPart {
  x: number;
  z: number;
}

export interface MissionResult {
  missionId: string;
  flight: FlightState;
  prediction: Prediction;
  payout: Payout;
}

interface GameState {
  coins: number;
  unlocked: string[];
  screen: Screen;
  missionId: string;
  /** Top (index 0) to bottom. */
  stack: StackPart[];
  loose: LoosePart[];
  draggingUid: string | null;
  fuelLoad: number; // 0.1..1
  angle: number; // degrees
  lastResult: MissionResult | null;
  completed: string[];
  muted: boolean;
  hubFocus: string | null;
  setHubFocus: (id: string | null) => void;

  setScreen: (s: Screen) => void;
  selectMission: (id: string) => void;
  unlock: (partId: string) => boolean;
  spawnPart: (partId: string, x?: number, z?: number) => void;
  removeLoose: (uid: string) => void;
  startDrag: (uid: string) => void;
  dropLoose: (uid: string, x: number, z: number) => void;
  attach: (uid: string, where: "top" | "bottom") => void;
  clearPad: () => void;
  setFuelLoad: (v: number) => void;
  setAngle: (v: number) => void;
  launch: () => boolean;
  finishMission: (r: MissionResult) => void;
  grant: () => void;
  toggleMute: () => void;
}

let uidCounter = 0;
const uid = () => `p${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

/** Pulls a uid out of stack or loose, returning its partId. */
function take(state: Pick<GameState, "stack" | "loose">, id: string) {
  const s = state.stack.find((p) => p.uid === id);
  if (s) return { partId: s.partId, stack: state.stack.filter((p) => p.uid !== id), loose: state.loose };
  const l = state.loose.find((p) => p.uid === id);
  if (l) return { partId: l.partId, stack: state.stack, loose: state.loose.filter((p) => p.uid !== id) };
  return null;
}

export const DECK_X = 7.5;
export const DECK_Z = 3.6;

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      coins: START_COINS,
      unlocked: STARTER_UNLOCKS,
      screen: "hub",
      missionId: "orbital-eye",
      stack: [],
      loose: [],
      draggingUid: null,
      fuelLoad: 1,
      angle: 60,
      lastResult: null,
      completed: [],
      muted: false,
      hubFocus: null,
      setHubFocus: (hubFocus) => set({ hubFocus }),

      setScreen: (screen) => set({ screen }),
      selectMission: (missionId) => set({ missionId, screen: "hangar" }),
      unlock: (partId) => {
        const part = getPart(partId);
        const { coins, unlocked } = get();
        if (unlocked.includes(partId) || coins < part.unlockCost) return false;
        set({ coins: coins - part.unlockCost, unlocked: [...unlocked, partId] });
        return true;
      },
      spawnPart: (partId, x, z) => {
        const { loose } = get();
        // Find a free slot on the deck if no drop position given.
        let px = x;
        let pz = z;
        if (px === undefined || pz === undefined) {
          const slots: [number, number][] = [];
          for (const zz of [1.8, -1.8]) for (const xx of [-2.8, 2.8, -4.6, 4.6, -6.4, 6.4]) slots.push([xx, zz]);
          const free = slots.find(([sx, sz]) => !loose.some((l) => Math.hypot(l.x - sx, l.z - sz) < 1.4)) ?? [-3, 2];
          [px, pz] = free;
        }
        set({ loose: [...loose, { uid: uid(), partId, x: clampX(px), z: clampZ(pz) }] });
      },
      removeLoose: (id) => set({ loose: get().loose.filter((l) => l.uid !== id) }),
      startDrag: (id) => set({ draggingUid: id }),
      dropLoose: (id, x, z) => {
        const t = take(get(), id);
        if (!t) {
          set({ draggingUid: null });
          return;
        }
        set({ stack: t.stack, loose: [...t.loose, { uid: id, partId: t.partId, x: clampX(x), z: clampZ(z) }], draggingUid: null });
      },
      attach: (id, where) => {
        const t = take(get(), id);
        if (!t) {
          set({ draggingUid: null });
          return;
        }
        const part = { uid: id, partId: t.partId };
        set({ stack: where === "top" ? [part, ...t.stack] : [...t.stack, part], loose: t.loose, draggingUid: null });
      },
      clearPad: () => set({ stack: [], loose: [] }),
      setFuelLoad: (fuelLoad) => set({ fuelLoad }),
      setAngle: (angle) => set({ angle }),
      launch: () => {
        const { stack, coins } = get();
        const a = analyzeBuild(stack.map((p) => p.partId));
        if (!a.valid || coins < a.cost) return false;
        set({ coins: coins - a.cost, screen: "flight" });
        return true;
      },
      finishMission: (r) =>
        set((s) => ({
          lastResult: r,
          coins: s.coins + r.payout.total,
          completed: r.flight.success && !s.completed.includes(r.missionId) ? [...s.completed, r.missionId] : s.completed,
          screen: "debrief",
        })),
      grant: () => set((s) => ({ coins: s.coins + GRANT_AMOUNT })),
      toggleMute: () => set((s) => ({ muted: !s.muted })),
    }),
    {
      name: "space-max-save-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        coins: s.coins,
        unlocked: s.unlocked,
        stack: s.stack,
        loose: s.loose,
        missionId: s.missionId,
        fuelLoad: s.fuelLoad,
        angle: s.angle,
        completed: s.completed,
        muted: s.muted,
      }),
    },
  ),
);

function clampX(x: number) {
  return Math.max(-DECK_X + 0.9, Math.min(DECK_X - 0.9, x));
}
function clampZ(z: number) {
  return Math.max(-DECK_Z + 0.9, Math.min(DECK_Z - 0.9, z));
}

export function useBuild(fuelLoad = 1): BuildAnalysis {
  const stack = useGame((s) => s.stack);
  return analyzeBuild(stack.map((p) => p.partId), fuelLoad);
}
