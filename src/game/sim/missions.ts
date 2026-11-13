export type PlanetLook = "earth" | "mars" | "ice";

export interface Mission {
  id: string;
  name: string;
  codename: string;
  brief: string;
  /** Effective (post-loss) velocity needed, m/s. */
  requiredDv: number;
  /** Best launch trajectory angle in degrees above the horizon. */
  optimalAngle: number;
  /** Recommended liftoff thrust-to-weight. Informational. */
  recommendedTwr: number;
  reward: number;
  planet: PlanetLook;
  difficulty: 1 | 2 | 3;
}

export const MISSIONS: Mission[] = [
  {
    id: "orbital-eye",
    name: "Orbital Eye",
    codename: "OE-1",
    brief: "Insert a surveillance satellite into low Earth orbit. A shallow, efficient ascent wins.",
    requiredDv: 3000,
    optimalAngle: 45,
    recommendedTwr: 1.3,
    reward: 600,
    planet: "earth",
    difficulty: 1,
  },
  {
    id: "red-planet",
    name: "Red Planet Explorer",
    codename: "RPE-2",
    brief: "Throw a lander onto a Mars transfer. You will need more than one stage.",
    requiredDv: 5000,
    optimalAngle: 60,
    recommendedTwr: 1.3,
    reward: 1600,
    planet: "mars",
    difficulty: 2,
  },
  {
    id: "deep-space",
    name: "Deep Space Probe",
    codename: "DSP-3",
    brief: "Escape the inner system toward the ice giants. Every kilogram counts.",
    requiredDv: 7000,
    optimalAngle: 72,
    recommendedTwr: 1.5,
    reward: 3200,
    planet: "ice",
    difficulty: 3,
  },
];

export const MISSION_MAP: Record<string, Mission> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

/** Ascent corridor half-width shown to the player as a hint. */
export const CORRIDOR_HINT = 15;
