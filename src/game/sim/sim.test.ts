import { describe, expect, it } from "vitest";
import { analyzeBuild } from "./rocket";
import { createFlight, predict, stepFlight, MAXQ_END, MAXQ_START, progress, type FlightState } from "./flight";
import { MISSION_MAP } from "./missions";
import { computePayout, START_COINS } from "./economy";

const STARTER = ["pod-kestrel", "tank-m", "tank-m", "eng-spark"];
const RED = ["pod-kestrel", "tank-m", "tank-m", "eng-spark", "tank-l", "tank-l", "eng-mammoth"];
const DEEP = ["pod-vanguard", "tank-m", "eng-wisp", "tank-l", "tank-l", "tank-l", "eng-titan"];
const oe = MISSION_MAP["orbital-eye"]!;
const rp = MISSION_MAP["red-planet"]!;
const ds = MISSION_MAP["deep-space"]!;

/** Plays like a careful pilot: throttles for Max-Q, stages on time, dodges asteroids. */
function fly(s: FlightState, opts: { separate?: boolean; maxQ?: boolean; dodge?: boolean } = {}) {
  const { separate = true, maxQ = true, dodge = true } = opts;
  for (let i = 0; i < 60 * 600 && s.phase !== "done"; i++) {
    const p = progress(s);
    const throttle = maxQ && p >= MAXQ_START - 0.02 && p <= MAXQ_END ? 0.65 : 1;
    const st = s.stages[s.active];
    const sep = separate && !!st && st.fuel <= 0 && s.active < s.stages.length - 1;
    const lateral = dodge && s.asteroid.state === "incoming" ? (s.asteroid.laneX > 0 ? -1 : 1) : 0;
    stepFlight(s, 1 / 60, { throttle, lateral, separate: sep });
  }
  return s;
}

describe("economy", () => {
  it("starts the player with 1000 SpaceCoins", () => {
    expect(START_COINS).toBe(1000);
  });
});

describe("build analysis", () => {
  it("requires a pod on top and an engine at the bottom", () => {
    expect(analyzeBuild(["tank-m", "eng-spark"]).valid).toBe(false);
    expect(analyzeBuild(["pod-kestrel", "eng-spark", "tank-m"]).valid).toBe(false);
    expect(analyzeBuild(STARTER).valid).toBe(true);
  });
  it("splits stages at each engine", () => {
    expect(analyzeBuild(RED).stages.length).toBe(2);
  });
  it("lower fuel load reduces delta-V", () => {
    expect(analyzeBuild(STARTER, 0.5).deltaV).toBeLessThan(analyzeBuild(STARTER, 1).deltaV);
  });
});

describe("flight", () => {
  it("starter rocket can reach Orbital Eye at the ideal angle", () => {
    expect(predict(STARTER, oe, 1, 45).viable).toBe(true);
    const s = fly(createFlight(STARTER, oe, 1, 45, () => 0.3));
    expect(s.success).toBe(true);
  });
  it("starter rocket fails Orbital Eye far off the corridor", () => {
    expect(predict(STARTER, oe, 1, 85).viable).toBe(false);
  });
  it("two-stage build reaches Red Planet; skipping separation explodes", () => {
    expect(predict(RED, rp, 1, 60).viable).toBe(true);
    expect(fly(createFlight(RED, rp, 1, 60, () => 0.3)).success).toBe(true);
    expect(fly(createFlight(RED, rp, 1, 60, () => 0.3), { separate: false }).failure).toBe("stage-not-separated");
  });
  it("deep space is reachable with late-game parts", () => {
    expect(predict(DEEP, ds, 1, 72).viable).toBe(true);
  });
  it("full throttle through Max-Q breaks the hull", () => {
    expect(fly(createFlight(STARTER, oe, 1, 45, () => 0.3), { maxQ: false }).failure).toBe("max-q");
  });
  it("ignoring the asteroid is fatal", () => {
    expect(fly(createFlight(STARTER, oe, 1, 45, () => 0.3), { dodge: false }).failure).toBe("asteroid");
  });
  it("too-heavy rocket never lifts off", () => {
    const heavy = ["pod-kestrel", "tank-l", "tank-l", "tank-l", "eng-spark"];
    expect(fly(createFlight(heavy, oe, 1, 45, () => 0.3)).failure).toBe("no-liftoff");
  });
  it("pays the full reward plus a bonus on success and partial salvage on failure", () => {
    const ok = fly(createFlight(STARTER, oe, 1, 45, () => 0.3));
    expect(computePayout(oe, ok).base).toBe(600);
    const bad = fly(createFlight(STARTER, oe, 1, 45, () => 0.3), { dodge: false });
    expect(computePayout(oe, bad).total).toBeLessThan(600 * 0.15 + 1);
  });
});

describe("predictions (calibration print)", () => {
  it("prints", () => {
    for (const [n, st, m, a] of [["oe", STARTER, oe, 45], ["rp", RED, rp, 60], ["ds", DEEP, ds, 72], ["oe-starter-rp", STARTER, rp, 60]] as const) {
      const p = predict([...st], m, 1, a);
      console.log(n, Math.round(p.achievableDv), m.requiredDv, p.liftoffTwr.toFixed(2));
    }
  });
});
