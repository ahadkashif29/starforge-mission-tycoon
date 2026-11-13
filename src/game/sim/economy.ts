import type { Mission } from "./missions";
import type { FlightState } from "./flight";
import { fuelRemainingFraction, progress } from "./flight";

export const START_COINS = 1000;
export const GRANT_THRESHOLD = 400;
export const GRANT_AMOUNT = 500;

export interface Payout {
  base: number;
  bonus: number;
  total: number;
  label: string;
}

export function computePayout(mission: Mission, flight: FlightState): Payout {
  if (flight.success) {
    const bonus = Math.round(mission.reward * 0.4 * fuelRemainingFraction(flight));
    return { base: mission.reward, bonus, total: mission.reward + bonus, label: "Mission contract + fuel efficiency bonus" };
  }
  const salvage = Math.round(mission.reward * 0.15 * Math.min(1, progress(flight)));
  return { base: salvage, bonus: 0, total: salvage, label: "Telemetry salvage payment" };
}
