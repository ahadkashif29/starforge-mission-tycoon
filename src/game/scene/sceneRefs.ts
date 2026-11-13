import type * as THREE from "three";

/** Camera + canvas element for DOM-side raycasts (inventory drop). */
export const sceneRefs: { camera: THREE.Camera | null; dom: HTMLCanvasElement | null } = { camera: null, dom: null };
