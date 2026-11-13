import { createFileRoute } from "@tanstack/react-router";
import { Game } from "@/game/Game";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Space Max — Build, Launch & Fly Rocket Missions" },
      { name: "description", content: "Assemble rockets in a 3D hangar, tune fuel and trajectory, then fly missions to orbit, Mars and deep space." },
      { property: "og:title", content: "Space Max — Build, Launch & Fly Rocket Missions" },
      { property: "og:description", content: "A rocket engineering tycoon: snap parts together, run the MultiSim, survive staging and asteroids." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});
