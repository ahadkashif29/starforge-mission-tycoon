import type { FlightState } from "./flight";
import { progress } from "./flight";
import type { Prediction } from "./flight";

export interface DebriefText {
  headline: string;
  cause: string;
  paragraphs: string[];
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function explain(s: FlightState, pred: Prediction): DebriefText {
  const off = Math.abs(s.angle - s.optimalAngle);
  const paragraphs: string[] = [];
  const theory = pred.viable
    ? `MultiSim analysis: with perfect piloting this build could reach ${fmt(pred.achievableDv)} m/s against the ${fmt(s.requiredDv)} m/s target. The design was viable.`
    : pred.liftoffTwr < 1
      ? `MultiSim analysis: liftoff thrust-to-weight was ${pred.liftoffTwr.toFixed(2)}. Anything below 1.00 cannot leave the pad, no matter how it is flown.`
      : `MultiSim analysis: even flown perfectly, this build tops out at ${fmt(pred.achievableDv)} m/s, short of the ${fmt(s.requiredDv)} m/s target by ${fmt(s.requiredDv - pred.achievableDv)} m/s. The failure was baked into the design.`;

  const traj =
    off <= 5
      ? `Trajectory: ${s.angle}° was within ${off}° of the ideal ${s.optimalAngle}° corridor. Almost no thrust was wasted.`
      : `Trajectory: ${s.angle}° was ${off}° off the ideal ${s.optimalAngle}°. Only ${Math.round(s.trajEff * 100)}% of the thrust went into useful velocity, costing ${fmt(s.trajectoryLoss)} m/s.`;

  const grav = `Gravity drag ate ${fmt(s.gravityLoss)} m/s. Longer burns (low thrust or low throttle) lose more to gravity.`;

  let headline = "Mission Failed";
  let cause = "";
  switch (s.failure) {
    case "no-liftoff":
      cause = "Too heavy to lift off";
      paragraphs.push("The engines could not out-push the rocket's own weight. Add thrust (a bigger first-stage engine) or cut mass (lower fuel load, fewer tanks).");
      break;
    case "fuel-depleted":
      cause = "Ran out of delta-V";
      paragraphs.push(`The final stage burned dry at ${fmt(s.peakVelocity)} m/s, ${Math.round(progress(s) * 100)}% of the way to orbit speed. More fuel, a lighter payload, more stages or a better trajectory would close the gap.`);
      break;
    case "stage-not-separated":
      cause = "Spent stage not jettisoned";
      paragraphs.push("An empty stage stayed bolted on. Its dead weight dragged velocity down and the upper engine fired straight into the empty tank. Hit SEPARATE (or Space) as soon as a stage burns out.");
      break;
    case "max-q":
      cause = "Structural failure at Max-Q";
      paragraphs.push(`Aerodynamic stress peaked at ${Math.round(s.peakStress)}%. During the Max-Q window, keep the throttle at 70% or below to let the hull survive the densest air.`);
      break;
    case "asteroid":
      cause = "Asteroid collision";
      paragraphs.push(`The rocket was only ${s.asteroid.miss.toFixed(1)} units from the rock's path; at least 1.5 was needed. Burn lateral thrusters (A / D) away from the incoming asteroid as soon as the warning sounds.`);
      break;
    case "stall":
      cause = "Velocity collapsed";
      paragraphs.push("With the throttle too low, gravity pulled more velocity away than the engines added. Keep the throttle up outside the Max-Q window.");
      break;
    default:
      headline = "Mission Success";
      cause = "Target velocity reached";
      paragraphs.push(`The vehicle reached ${fmt(s.velocity)} m/s and coasted onto its target trajectory with ${s.separations} stage separation${s.separations === 1 ? "" : "s"}.`);
  }
  paragraphs.push(theory, traj, grav);
  if (s.earlySeparations > 0) paragraphs.push(`${s.earlySeparations} stage(s) were dropped with fuel still aboard, wasting delta-V.`);
  return { headline, cause, paragraphs };
}
