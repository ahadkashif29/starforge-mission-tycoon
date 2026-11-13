import { ArrowLeft, ArrowRight, Lock, MousePointerClick, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuild, useGame } from "../store";
import { PARTS, type PartCategory, type PartDef } from "../sim/parts";
import { MISSION_MAP } from "../sim/missions";
import { CoinBadge, Stat, fmt } from "./common";
import { cn } from "@/lib/utils";

const CATS: { id: PartCategory; label: string }[] = [
  { id: "pod", label: "Command Pods" },
  { id: "tank", label: "Fuel Tanks" },
  { id: "engine", label: "Thrusters" },
];

function partStats(p: PartDef) {
  if (p.category === "pod") return `${p.mass} t · RCS ×${p.rcs} · Hull ×${p.structure}`;
  if (p.category === "tank") return `${p.mass} t dry · ${p.fuel} t fuel`;
  return `${p.mass} t · ${p.thrust} kN · Isp ${p.isp}s`;
}

function PartCard({ p }: { p: PartDef }) {
  const unlocked = useGame((s) => s.unlocked.includes(p.id));
  const coins = useGame((s) => s.coins);
  const unlock = useGame((s) => s.unlock);
  const spawn = useGame((s) => s.spawnPart);
  return (
    <div
      draggable={unlocked}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/space-max-part", p.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className={cn(
        "group rounded-md border border-border bg-background/50 p-2.5 transition-colors",
        unlocked ? "cursor-grab hover:border-primary/60 active:cursor-grabbing" : "opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {!unlocked && <Lock className="size-3.5 text-muted-foreground" aria-label="Locked" />}
            <span className="truncate">{p.name}</span>
          </div>
          <div className="font-mono text-[0.68rem] text-muted-foreground">{partStats(p)}</div>
        </div>
        {unlocked ? (
          <button
            onClick={() => spawn(p.id)}
            className="shrink-0 rounded border border-border p-1 text-muted-foreground hover:border-primary hover:text-primary"
            aria-label={`Place ${p.name} on the pad`}
          >
            <Plus className="size-3.5" />
          </button>
        ) : null}
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="hud-label">Build cost <span className="text-foreground">{p.cost}</span></span>
        {!unlocked && (
          <Button size="sm" variant="outline" className="h-6 px-2 text-[0.7rem]" disabled={coins < p.unlockCost} onClick={() => unlock(p.id)}>
            Unlock · {fmt(p.unlockCost)}
          </Button>
        )}
      </div>
    </div>
  );
}

export function HangarUI() {
  const stack = useGame((s) => s.stack);
  const loose = useGame((s) => s.loose);
  const missionId = useGame((s) => s.missionId);
  const coins = useGame((s) => s.coins);
  const setScreen = useGame((s) => s.setScreen);
  const clearPad = useGame((s) => s.clearPad);
  const a = useBuild();
  const mission = MISSION_MAP[missionId]!;
  const affordable = coins >= a.cost;

  return (
    <div className="pointer-events-none flex h-full gap-3 p-3">
      <aside className="panel pointer-events-auto flex w-72 shrink-0 flex-col overflow-hidden" aria-label="Parts inventory">
        <div className="border-b border-border px-4 py-3">
          <div className="hud-label text-primary">Inventory</div>
          <p className="mt-1 text-xs text-muted-foreground">Drag a part onto the launchpad, or press +.</p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          {CATS.map((c) => (
            <section key={c.id}>
              <h3 className="hud-label mb-2">{c.label}</h3>
              <div className="space-y-2">
                {PARTS.filter((p) => p.category === c.id).map((p) => (
                  <PartCard key={p.id} p={p} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </aside>

      <div className="flex flex-1 flex-col justify-between">
        <div className="pointer-events-auto mx-auto mt-1 flex items-center gap-2 rounded-full border border-border bg-panel px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <MousePointerClick className="size-3.5 text-primary" />
          Drag parts to the glowing rings to snap them. Only the top and bottom parts can be pulled off. Double-click a loose part to return it.
        </div>
        <div />
      </div>

      <aside className="panel pointer-events-auto flex w-80 shrink-0 flex-col overflow-hidden" aria-label="Build manifest">
        <div className="border-b border-border px-4 py-3">
          <div className="hud-label text-primary">Contract · {mission.codename}</div>
          <div className="brand text-lg text-foreground">{mission.name}</div>
          <div className="font-mono text-xs text-muted-foreground">Target ΔV {fmt(mission.requiredDv)} m/s · Reward <CoinBadge amount={mission.reward} className="text-xs" /></div>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          <Stat label="Total mass" value={fmt(a.totalMass, 2)} unit="t" />
          <Stat label="Liftoff thrust" value={fmt(a.liftoffThrust)} unit="kN" />
          <Stat label="Delta-V (ideal)" value={fmt(a.deltaV)} unit="m/s" tone="primary" />
          <Stat label="Liftoff TWR" value={a.totalMass ? a.liftoffTwr.toFixed(2) : "—"} tone="accent" />
          <Stat label="Stages" value={String(a.stages.length)} />
          <Stat label="Launch cost" value={fmt(a.cost)} unit="SC" tone={affordable ? undefined : "bad"} />
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <h3 className="hud-label mb-2">Stack · top to bottom</h3>
          {stack.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              Nothing mounted yet. Drag a command pod onto the ring above the launch clamp, then build downward.
            </p>
          ) : (
            <ol className="space-y-1">
              {stack.map((p, i) => {
                const stageIdx = a.stages.findIndex((s) => s.partIndices.includes(i));
                return (
                  <li key={p.uid} className="flex items-center justify-between rounded border border-border/60 bg-background/40 px-2 py-1 text-xs">
                    <span className="text-foreground">{PARTS.find((x) => x.id === p.partId)?.name}</span>
                    <span className="hud-label">{stageIdx >= 0 ? `Stage ${stageIdx + 1}` : "Payload"}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {loose.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{loose.length} loose part(s) on the deck are not counted.</p>}
          {a.errors.length > 0 && stack.length > 0 && (
            <ul className="mt-3 space-y-1">
              {a.errors.map((e) => (
                <li key={e} className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                  {e}
                </li>
              ))}
            </ul>
          )}
          {!affordable && a.valid && <p className="mt-2 text-xs text-destructive">Not enough SpaceCoins to fly this build.</p>}
        </div>
        <div className="flex gap-2 border-t border-border p-3">
          <Button variant="outline" size="icon" onClick={() => setScreen("hub")} aria-label="Back to mission hub">
            <ArrowLeft />
          </Button>
          <Button variant="outline" size="icon" onClick={clearPad} aria-label="Clear the launchpad">
            <Trash2 />
          </Button>
          <Button className="flex-1 font-semibold uppercase tracking-wide" disabled={!a.valid || !affordable} onClick={() => setScreen("console")}>
            MultiSim Console <ArrowRight />
          </Button>
        </div>
      </aside>
    </div>
  );
}
