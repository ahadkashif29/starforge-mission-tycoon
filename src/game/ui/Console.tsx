import { ArrowLeft, Lock, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useBuild, useGame } from "../store";
import { MISSION_MAP, CORRIDOR_HINT } from "../sim/missions";
import { unlockAudio } from "../audio";
import { Stat, fmt } from "./common";

export function ConsoleUI() {
  const fuelLoad = useGame((s) => s.fuelLoad);
  const angle = useGame((s) => s.angle);
  const setFuel = useGame((s) => s.setFuelLoad);
  const setAngle = useGame((s) => s.setAngle);
  const missionId = useGame((s) => s.missionId);
  const setScreen = useGame((s) => s.setScreen);
  const launch = useGame((s) => s.launch);
  const coins = useGame((s) => s.coins);
  const a = useBuild(fuelLoad);
  const mission = MISSION_MAP[missionId]!;
  const burn = a.stages.reduce((t, s) => t + s.burnTime, 0);

  return (
    <div className="pointer-events-none flex h-full items-end justify-end p-3 md:items-center">
      <section className="panel scanlines pointer-events-auto w-full max-w-md p-5" aria-label="MultiSim pre-launch console">
        <div className="flex items-center justify-between">
          <div>
            <div className="hud-label text-primary">MultiSim · Pre-launch</div>
            <h2 className="brand text-2xl text-foreground">Flight Parameters</h2>
          </div>
          <span className="hud-label rounded border border-border px-2 py-1">{mission.codename}</span>
        </div>

        <div className="mt-5 space-y-6">
          <div>
            <div className="flex items-baseline justify-between">
              <label className="hud-label" htmlFor="fuel">Fuel load</label>
              <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">{Math.round(fuelLoad * 100)}%</span>
            </div>
            <Slider id="fuel" className="mt-2" min={10} max={100} step={1} value={[Math.round(fuelLoad * 100)]} onValueChange={([v]) => setFuel((v ?? 100) / 100)} aria-label="Fuel load percent" />
            <p className="mt-1 text-xs text-muted-foreground">Less fuel = lighter and punchier off the pad, but less total ΔV.</p>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className="hud-label" htmlFor="angle">Trajectory angle</label>
              <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">{angle}°</span>
            </div>
            <Slider id="angle" className="mt-2" min={30} max={89} step={1} value={[angle]} onValueChange={([v]) => setAngle(v ?? 60)} aria-label="Launch trajectory angle in degrees" />
            <p className="mt-1 text-xs text-muted-foreground">
              Final pitch above the horizon. Mission corridor: {mission.optimalAngle - CORRIDOR_HINT}–{mission.optimalAngle + CORRIDOR_HINT}°.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Stat label="Wet mass" value={fmt(a.totalMass, 2)} unit="t" />
          <Stat label="Liftoff TWR" value={a.liftoffTwr.toFixed(2)} tone="accent" />
          <Stat label="Ideal ΔV" value={fmt(a.deltaV)} unit="m/s" tone="primary" />
          <Stat label="Full-throttle burn" value={fmt(burn)} unit="s" />
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="size-3.5 shrink-0 text-primary" />
          Viability analysis runs at ignition. Results are sealed until the debrief.
        </div>
        <div className="mt-4 rounded-md border border-border/70 px-3 py-2 font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
          In flight: <span className="text-foreground">W/S</span> throttle · <span className="text-foreground">Space</span> separate stage · <span className="text-foreground">A/D</span> lateral thrusters
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => setScreen("hangar")}>
            <ArrowLeft /> Hangar
          </Button>
          <Button
            className="flex-1 font-semibold uppercase tracking-wide glow-primary"
            disabled={coins < a.cost || !a.valid}
            onClick={() => {
              unlockAudio();
              launch();
            }}
          >
            <Rocket /> Commit & Launch · {fmt(a.cost)} SC
          </Button>
        </div>
      </section>
    </div>
  );
}
