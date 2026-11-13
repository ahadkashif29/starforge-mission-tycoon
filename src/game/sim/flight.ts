// Flight simulation: pure TypeScript, no React/three. The scene only draws this state.
import { analyzeBuild, trajectoryEfficiency, G0, type BuildAnalysis } from "./rocket";
import type { Mission } from "./missions";

/** Game seconds that pass per real second (keeps burns watchable). */
export const TIME_SCALE = 8;
export const COUNTDOWN = 3; // real s
/** Gravity loss in m/s^2 at liftoff, fading as the rocket pitches over. */
export const GRAVITY_LOSS = 2.6;
export const GRAVITY_LOSS_FADE = 0.75;
export const MAXQ_START = 0.1; // progress fraction
export const MAXQ_END = 0.3;
export const MAXQ_SAFE_THROTTLE = 0.7;
export const STRESS_RATE = 5; // per game s at full throttle in Max-Q
export const STRESS_DECAY = 3;
export const SEPARATION_GRACE = 5; // real s after burnout to jettison
export const ASTEROID_TRIGGER = 0.5; // progress fraction
export const ASTEROID_WARNING = 4.5; // real s to impact
export const ASTEROID_RADIUS = 1.5; // lateral miss distance needed
export const RCS_ACCEL = 3.2; // lateral units/s^2 (real time)
export const RCS_DAMP = 1.2;
export const APPROACH_TIME = 6; // real s
export const EXPLOSION_TIME = 3.5;
export const LIFTOFF_STRAIN = 2.5;
export const BURNOUT_COAST = 1.5;

export type FailureCode = "no-liftoff" | "fuel-depleted" | "stage-not-separated" | "max-q" | "asteroid" | "stall";
export type Phase = "countdown" | "ascent" | "approach" | "exploding" | "done";

export interface StageRuntime {
  partIndices: number[];
  fuel: number; // kg
  fuelMax: number; // kg
  dry: number; // kg
  thrust: number; // N
  isp: number;
  attached: boolean;
}

export interface FlightEvent {
  t: number;
  text: string;
  tone: "info" | "warn" | "bad" | "good";
}

export interface FlightState {
  missionId: string;
  requiredDv: number;
  angle: number;
  optimalAngle: number;
  trajEff: number;
  fuelLoad: number;
  structure: number;
  rcs: number;
  payload: number; // kg
  stages: StageRuntime[]; // bottom first
  active: number; // index of the lowest attached stage
  phase: Phase;
  phaseTime: number; // real s in phase
  t: number; // real s since start
  missionTime: number; // game s since liftoff
  velocity: number; // effective m/s
  peakVelocity: number;
  throttle: number;
  gravityLoss: number;
  trajectoryLoss: number;
  stress: number;
  peakStress: number;
  inMaxQ: boolean;
  burnoutSince: number | null; // real s timer while a spent stage is still attached
  separations: number;
  earlySeparations: number;
  asteroid: { state: "pending" | "incoming" | "passed" | "hit"; timeToImpact: number; laneX: number; miss: number };
  lateralX: number;
  lateralV: number;
  failure: FailureCode | null;
  success: boolean;
  lifted: boolean;
  events: FlightEvent[];
}

export interface FlightInput {
  throttle: number; // 0..1
  lateral: number; // -1 left .. 1 right
  separate: boolean;
}

export interface FlightOptions {
  /** Ignore the target so the run measures max achievable velocity. */
  ignoreTarget?: boolean;
  /** Skip asteroid hazard (theoretical analysis). */
  noHazards?: boolean;
  rng?: () => number;
}

export function createFlight(stack: string[], mission: Mission, fuelLoad: number, angle: number, rng: () => number = Math.random): FlightState {
  const a = analyzeBuild(stack, fuelLoad);
  return createFlightFromAnalysis(a, mission, fuelLoad, angle, rng);
}

export function createFlightFromAnalysis(a: BuildAnalysis, mission: Mission, fuelLoad: number, angle: number, rng: () => number = Math.random): FlightState {
  return {
    missionId: mission.id,
    requiredDv: mission.requiredDv,
    angle,
    optimalAngle: mission.optimalAngle,
    trajEff: trajectoryEfficiency(angle, mission.optimalAngle),
    fuelLoad,
    structure: a.pod?.structure ?? 1,
    rcs: a.pod?.rcs ?? 1,
    payload: (a.pod?.mass ?? 0) * 1000,
    stages: a.stages.map((s) => ({
      partIndices: s.partIndices,
      fuel: s.fuelMass * 1000,
      fuelMax: s.fuelMass * 1000,
      dry: s.dryMass * 1000,
      thrust: s.engine.thrust * 1000,
      isp: s.engine.isp,
      attached: true,
    })),
    active: 0,
    phase: "countdown",
    phaseTime: 0,
    t: 0,
    missionTime: 0,
    velocity: 0,
    peakVelocity: 0,
    throttle: 1,
    gravityLoss: 0,
    trajectoryLoss: 0,
    stress: 0,
    peakStress: 0,
    inMaxQ: false,
    burnoutSince: null,
    separations: 0,
    earlySeparations: 0,
    asteroid: { state: "pending", timeToImpact: ASTEROID_WARNING, laneX: (rng() < 0.5 ? -1 : 1) * (0.2 + rng() * 0.4), miss: 0 },
    lateralX: 0,
    lateralV: 0,
    failure: null,
    success: false,
    lifted: false,
    events: [],
  };
}

export function totalMass(s: FlightState): number {
  return s.payload + s.stages.reduce((acc, st) => (st.attached ? acc + st.dry + st.fuel : acc), 0);
}

export function progress(s: FlightState): number {
  return Math.max(0, s.velocity / s.requiredDv);
}

export function fuelRemainingFraction(s: FlightState): number {
  const max = s.stages.reduce((a, st) => a + st.fuelMax, 0);
  const left = s.stages.reduce((a, st) => a + (st.attached ? st.fuel : 0), 0);
  return max > 0 ? left / max : 0;
}

function log(s: FlightState, text: string, tone: FlightEvent["tone"] = "info") {
  s.events.push({ t: s.missionTime, text, tone });
}

function fail(s: FlightState, code: FailureCode, text: string) {
  if (s.failure || s.success) return;
  s.failure = code;
  s.phase = "exploding";
  s.phaseTime = 0;
  log(s, text, "bad");
}

function separate(s: FlightState) {
  const st = s.stages[s.active];
  if (!st || s.active >= s.stages.length - 1) return false;
  if (st.fuel > 1) s.earlySeparations++;
  st.attached = false;
  s.active++;
  s.separations++;
  s.burnoutSince = null;
  log(s, `Stage ${s.active} jettisoned${st.fuel > 1 ? " with fuel still aboard" : ""}.`, st.fuel > 1 ? "warn" : "good");
  return true;
}

/** Advance the flight by dt real seconds. Mutates and returns the state. */
export function stepFlight(s: FlightState, dtReal: number, input: FlightInput, opts: FlightOptions = {}): FlightState {
  const dt = Math.min(dtReal, 0.1);
  s.t += dt;
  s.phaseTime += dt;

  if (s.phase === "countdown") {
    if (s.phaseTime >= COUNTDOWN) {
      s.phase = "ascent";
      s.phaseTime = 0;
      const st = s.stages[0];
      const twr = st ? st.thrust / (totalMass(s) * G0) : 0;
      if (twr >= 1) {
        s.lifted = true;
        log(s, "Liftoff. Clamps released.", "good");
      } else {
        log(s, `Engines straining: liftoff TWR only ${twr.toFixed(2)}.`, "warn");
      }
    }
    return s;
  }

  if (s.phase === "exploding") {
    if (s.phaseTime >= EXPLOSION_TIME) s.phase = "done";
    return s;
  }
  if (s.phase === "approach") {
    if (s.phaseTime >= APPROACH_TIME) s.phase = "done";
    return s;
  }
  if (s.phase === "done") return s;

  // ---- ascent ----
  if (!s.lifted) {
    if (s.phaseTime >= LIFTOFF_STRAIN) fail(s, "no-liftoff", "Rocket never left the pad. Engines overheated.");
    return s;
  }

  const gdt = dt * TIME_SCALE;
  s.missionTime += gdt;
  s.throttle = Math.max(0, Math.min(1, input.throttle));

  if (input.separate) separate(s);

  const st = s.stages[s.active];
  const p = progress(s);
  let thrust = 0;
  if (st && st.fuel > 0) {
    thrust = st.thrust * s.throttle;
    const mdot = thrust / (st.isp * G0);
    const burn = Math.min(st.fuel, mdot * gdt);
    const frac = mdot * gdt > 0 ? burn / (mdot * gdt) : 0;
    const m = totalMass(s);
    const dv = (thrust / m) * gdt * frac;
    st.fuel -= burn;
    s.velocity += dv * s.trajEff;
    s.trajectoryLoss += dv * (1 - s.trajEff);
    if (st.fuel <= 1) {
      st.fuel = 0;
      if (s.active < s.stages.length - 1) log(s, `Stage ${s.active + 1} burnout. Jettison it!`, "warn");
      else log(s, "Final stage burnout.", "info");
    }
  }

  const gl = GRAVITY_LOSS * (1 - GRAVITY_LOSS_FADE * Math.min(1, p)) * gdt;
  s.velocity -= gl;
  s.gravityLoss += gl;
  s.peakVelocity = Math.max(s.peakVelocity, s.velocity);

  // Max-Q structural stress.
  s.inMaxQ = p >= MAXQ_START && p <= MAXQ_END;
  if (s.inMaxQ && s.throttle > MAXQ_SAFE_THROTTLE && thrust > 0) {
    s.stress += ((s.throttle - MAXQ_SAFE_THROTTLE) / (1 - MAXQ_SAFE_THROTTLE)) * STRESS_RATE * gdt / s.structure;
  } else {
    s.stress = Math.max(0, s.stress - STRESS_DECAY * gdt);
  }
  s.peakStress = Math.max(s.peakStress, s.stress);
  if (s.stress >= 100 && !opts.noHazards) return fail(s, "max-q", "Structural failure at Max-Q. Hull buckled."), s;

  // Staging.
  const cur = s.stages[s.active];
  const spent = cur && cur.fuel <= 0;
  const hasUpper = s.active < s.stages.length - 1;
  if (spent && hasUpper) {
    if (s.burnoutSince === null) s.burnoutSince = 0;
    s.burnoutSince += dt;
    if (opts.noHazards) separate(s);
    else if (s.burnoutSince >= SEPARATION_GRACE)
      return fail(s, "stage-not-separated", "Spent stage never jettisoned. Upper engine ignited into the dead tank."), s;
  }
  if (spent && !hasUpper && !opts.ignoreTarget) {
    if (s.burnoutSince === null) s.burnoutSince = 0;
    s.burnoutSince += dt;
    if (s.burnoutSince >= BURNOUT_COAST && s.velocity < s.requiredDv)
      return fail(s, "fuel-depleted", "Out of fuel short of the target. Vehicle broke up on re-entry."), s;
  }
  if (opts.ignoreTarget && spent && !hasUpper) {
    s.phase = "done";
    return s;
  }

  // Asteroid hazard.
  if (!opts.noHazards) {
    const ast = s.asteroid;
    if (ast.state === "pending" && progress(s) >= ASTEROID_TRIGGER) {
      ast.state = "incoming";
      ast.timeToImpact = ASTEROID_WARNING;
      log(s, "Asteroid on intercept course! Burn lateral thrusters.", "warn");
    }
    s.lateralV += input.lateral * RCS_ACCEL * s.rcs * dt;
    s.lateralV *= Math.exp(-RCS_DAMP * dt);
    if (ast.state === "passed" && input.lateral === 0) s.lateralV += -s.lateralX * 0.8 * dt; // autopilot recenters
    s.lateralX = Math.max(-4, Math.min(4, s.lateralX + s.lateralV * dt));
    if (ast.state === "incoming") {
      ast.timeToImpact -= dt;
      if (ast.timeToImpact <= 0) {
        ast.miss = Math.abs(s.lateralX - ast.laneX);
        if (ast.miss < ASTEROID_RADIUS) {
          ast.state = "hit";
          return fail(s, "asteroid", "Direct asteroid impact."), s;
        }
        ast.state = "passed";
        log(s, `Asteroid cleared by ${ast.miss.toFixed(1)} m-units.`, "good");
      }
    }
  }

  if (s.velocity <= 0 && s.missionTime > 4) {
    s.velocity = 0;
    if (!opts.ignoreTarget) return fail(s, "stall", "Velocity collapsed. Rocket fell back toward the pad."), s;
  }
  s.velocity = Math.max(0, s.velocity);

  if (!opts.ignoreTarget && s.velocity >= s.requiredDv) {
    s.success = true;
    s.phase = "approach";
    s.phaseTime = 0;
    log(s, "Target velocity reached. Engines cut. Coasting to target.", "good");
  }
  return s;
}

export interface Prediction {
  achievableDv: number;
  requiredDv: number;
  viable: boolean;
  liftoffTwr: number;
  trajEff: number;
}

/** Ideal-pilot run: 100% throttle outside Max-Q, 70% inside, perfect staging, no hazards. */
export function predict(stack: string[], mission: Mission, fuelLoad: number, angle: number): Prediction {
  const a = analyzeBuild(stack, fuelLoad);
  const s = createFlightFromAnalysis(a, mission, fuelLoad, angle, () => 0.5);
  s.phase = "ascent";
  s.lifted = a.liftoffTwr >= 1;
  if (!s.lifted || !a.valid) {
    return { achievableDv: 0, requiredDv: mission.requiredDv, viable: false, liftoffTwr: a.liftoffTwr, trajEff: s.trajEff };
  }
  const opts = { ignoreTarget: true, noHazards: true };
  for (let i = 0; i < 200000 && s.phase === "ascent"; i++) {
    const p = progress(s);
    const throttle = p >= MAXQ_START - 0.01 && p <= MAXQ_END ? MAXQ_SAFE_THROTTLE : 1;
    stepFlight(s, 1 / 30, { throttle, lateral: 0, separate: false }, opts);
  }
  return {
    achievableDv: s.peakVelocity,
    requiredDv: mission.requiredDv,
    viable: s.peakVelocity >= mission.requiredDv,
    liftoffTwr: a.liftoffTwr,
    trajEff: s.trajEff,
  };
}
