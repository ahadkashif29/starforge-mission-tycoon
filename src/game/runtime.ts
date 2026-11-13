// Mutable per-frame state shared between the 3D scene and the DOM HUD. Not React state.
import type { FlightState } from "./sim/flight";

export const flightInput = {
  throttle: 1,
  left: false,
  right: false,
  touchLateral: 0,
  separateRequested: false,
};

export const flightRuntime: { state: FlightState | null; finished: boolean } = { state: null, finished: false };

/** Hangar drag state, written on pointer move, read in useFrame. */
export const dragState = {
  uid: null as string | null,
  partId: null as string | null,
  pos: { x: 0, y: 0, z: 0 },
  snap: null as null | "top" | "bottom",
};
