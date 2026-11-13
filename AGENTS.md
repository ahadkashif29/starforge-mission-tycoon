<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Space Max architecture

- Game rules, physics, economy and debrief text live in `src/game/sim/` as pure TypeScript (no React/three) with vitest tests in `sim.test.ts`; scenes only draw sim state, so physics changes stay testable.
- One `<Canvas>` (`src/game/scene/GameCanvas.tsx`) swaps scenes by `screen` from the zustand store; DOM UI overlays it. Avoids remounting WebGL per screen.
- Per-frame flight/drag state lives in mutable objects in `src/game/runtime.ts`, never zustand; the flight HUD polls at 10 Hz. Keeps React out of the frame loop.
- The flight sim is advanced only by the `Stepper` `useFrame` in `FlightScene.tsx` (priority -1) before any visual reads it.
- Hangar snapping is tested in screen space (projected node distance), not 3D distance, so it matches what the player sees.
- `/` uses `ssr: false` because the whole game is WebGL/browser-only.
- Dev hooks (dev builds only): `window.__game = { store, flight, input, project(x,y,z) }`; canvas wrapper gets `data-scene-ready` after the first frames. Save key in localStorage: `space-max-save-v1`.
