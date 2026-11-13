import { Home, RotateCcw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "../store";
import { MISSION_MAP } from "../sim/missions";
import { explain } from "../sim/debrief";
import { CoinBadge, Stat, fmt } from "./common";
import { cn } from "@/lib/utils";

export function Debrief() {
  const r = useGame((s) => s.lastResult);
  const setScreen = useGame((s) => s.setScreen);
  if (!r) return null;
  const s = r.flight;
  const mission = MISSION_MAP[r.missionId]!;
  const text = explain(s, r.prediction);
  const ok = s.success;
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center overflow-y-auto bg-background/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="debrief-title">
      <div className={cn("panel w-full max-w-2xl bg-panel-strong p-6", ok ? "border-success/60" : "border-destructive/60")}>
        <div className="hud-label">Post-mission debrief · {mission.codename} {mission.name}</div>
        <h2 id="debrief-title" className={cn("brand mt-1 text-4xl", ok ? "text-success" : "text-destructive")}>
          {text.headline}
        </h2>
        <p className="mt-1 font-mono text-sm uppercase tracking-wider text-foreground">{text.cause}</p>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Peak velocity" value={fmt(s.peakVelocity)} unit="m/s" tone={ok ? "good" : "bad"} />
          <Stat label="Required" value={fmt(s.requiredDv)} unit="m/s" />
          <Stat label="MultiSim max" value={fmt(r.prediction.achievableDv)} unit="m/s" tone={r.prediction.viable ? "accent" : "warn"} />
          <Stat label="Liftoff TWR" value={r.prediction.liftoffTwr.toFixed(2)} />
          <Stat label="Gravity loss" value={fmt(s.gravityLoss)} unit="m/s" />
          <Stat label="Trajectory loss" value={fmt(s.trajectoryLoss)} unit="m/s" />
          <Stat label="Peak stress" value={`${Math.round(s.peakStress)}%`} tone={s.peakStress > 70 ? "warn" : undefined} />
          <Stat label="Angle / fuel" value={`${s.angle}° · ${Math.round(s.fuelLoad * 100)}%`} />
        </div>

        <div className="mt-5 space-y-2.5 text-sm leading-relaxed text-foreground/90">
          {text.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-md border border-border bg-background/50 px-4 py-3">
          <div>
            <div className="hud-label">{r.payout.label}</div>
            {r.payout.bonus > 0 && (
              <div className="font-mono text-xs text-muted-foreground">
                {fmt(r.payout.base)} contract + {fmt(r.payout.bonus)} efficiency bonus
              </div>
            )}
          </div>
          <CoinBadge amount={r.payout.total} className="text-2xl" />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setScreen("hub")}>
            <Home /> Mission hub
          </Button>
          <Button variant="outline" onClick={() => setScreen("hangar")}>
            <Wrench /> Rebuild in hangar
          </Button>
          <Button className="flex-1 font-semibold uppercase tracking-wide" onClick={() => setScreen("console")}>
            <RotateCcw /> Fly again
          </Button>
        </div>
      </div>
    </div>
  );
}
