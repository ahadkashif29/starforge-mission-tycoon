import { Environment, Lightformer } from "@react-three/drei";

export function StudioLighting({ shadows = true }: { shadows?: boolean }) {
  return (
    <>
      <hemisphereLight args={["#b9c6d8", "#2a2420", 0.55]} />
      <directionalLight
        position={[8, 14, 7]}
        intensity={2.2}
        color="#fff1dc"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={16}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-8, 5, -6]} intensity={0.6} color="#7fa3d6" />
      <Environment resolution={128}>
        <Lightformer intensity={2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer intensity={1.2} color="#ffb070" position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[16, 2, 1]} />
        <Lightformer intensity={1} color="#8fb4e6" position={[6, 3, 2]} rotation-y={-Math.PI / 2} scale={[16, 3, 1]} />
      </Environment>
    </>
  );
}
