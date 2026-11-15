# Starforge Mission Tycoon

Role: Act as a Senior Full-Stack Game Developer and UI/UX Expert specializing in React, React Three Fiber (Three.js), Tailwind CSS, and Zustand.

Task: Build a "Simulation-meets-Tycoon" 3D Space Mission Game prototype from scratch named "Space Max". The game must balance technical engineering (MultiSim) with interactive gameplay.

Core State Management (Zustand):
- Track Player Economy: 'SpaceCoins' (Start with 1000).
- Track Inventory: Unlocked vs Locked parts (Command Pods, Thrusters, Fuel Tanks).
- Track Active Build Metrics: Total Mass, Total Thrust, Delta-V calculation.

Game Flow & Systems to Build:

1. Mission Hub & Economy UI:
- A sleek, dark-themed dashboard featuring "Space Max" bold branding. 
- 3 Missions: "Orbital Eye", "Red Planet Explorer", "Deep Space Probe". Each offers different SpaceCoin rewards and physics requirements.

2. The Hangar (Minecraft-Style Assembly):
- Split layout: Inventory UI on the left, 3D R3F Canvas in the center.
- Implement Drag-and-Drop interactive assembly. Parts spawned from the inventory must be manually dragged and snapped together using attachment nodes on a 3D launchpad.
- Use detailed procedural R3F geometries with metallic/PBR materials as placeholders.

3. "MultiSim" Pre-Launch Console:
- Before launch, the user must interact with a control panel to set: Fuel Load (%) and Launch Trajectory Angle. 
- The game calculates if their custom build and parameters can theoretically reach the target. Do NOT show pass/fail warnings early.

4. Semi-Autonomous Launch & Space Flight:
- Transition to a dynamic 3D space scene upon launch. The rocket follows the trajectory automatically, but the player manages critical systems:
  - Throttle Control Slider to manage fuel consumption.
  - Stage Separation mechanics (Player must click to detach empty tanks mid-flight).
  - Hazard Events: A mid-flight "Asteroid" warning requiring a quick lateral thruster burn (A/D keys) to survive.
- Animate a spectacular physics-based explosion mid-air if calculations failed or stages weren't separated. If successful, show a smooth planetary approach.

5. Post-Mission Debrief:
- Show a detailed UI modal explaining exactly why the physics failed or succeeded, and award SpaceCoins accordingly.

Deliverable: Generate the complete Vite + React project, wiring the UI, the Zustand store, the drag-and-drop R3F hangar, and the flight simulation physics into one cohesive "Space Max" application.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://starforge-mission-tycoon.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fc11de91-c81a-40db-aaf8-00752892d0ef).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
