import { useEffect, useReducer } from "react";
import { ChevronLeft, ChevronRight, TriangleAlert, Unlink } from "lucide-react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { flightInput, flightRuntime } from "../runtime";
import { MISSION_MAP } from "../sim/missions";
import { COUNTDOWN, MAXQ_SAFE_THROTTLE, SEPARATION_GRACE, progress } from "../sim/flight";
import { fmt } from "./common";
import { cn } from "@/lib/utils";

function useTick(ms: number) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const id = setInterval(force, ms);
    return () => clearInterval(id);
  }, [ms]);
}

function useFlightKeys() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
      if (e.code === "KeyA" || e.code === "ArrowLeft") flightInput.left = true;
      if (e.code === "KeyD" || e.code === "ArrowRight") flightInput.right = true;
      if (e.code === "KeyW" || e.code === "ArrowUp") flightInput.throttle = Math.min(1, flightInput.throttle + 0.05);
      if (e.code === "KeyS" || e.code === "ArrowDown") flightInput.throttle = Math.max(0, flightInput.throttle - 0.05);
      if (e.code === "Space" && !e.repeat) flightInput.separateRequested = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "KeyA" || e.code === "ArrowLeft") flightInput.left = false;
      if (e.code === "KeyD" || e.code === "ArrowRight") flightInput.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      flightInput.left = flightInput.right = false;
      flightInput.touchLateral = 0;
    };
  }, []);
}

function HoldButton({ dir, label }: { dir: -1 | 1; label: string }) {
  const set = (on: boolean) => (flightInput.touchLateral = on ? dir : 0);
  return (
    <button
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      className="panel flex h-16 w-16 touch-none select-none items-center justify-center text-foreground active:bg-primary/30"
      aria-label={label}
    >
      {dir < 0 ? <ChevronLeft className="size-7" /> : <ChevronRight className="size-7" />}
    </button>
  );
}

export function FlightHud() {
  useTick(100);
  useFlightKeys();
  const s = flightRuntime.state;
  if (!s) return null;
  const mission = MISSION_MAP[s.missionId]!;
  const p = progress(s);
  const st = s.stages[s.active];
  const spent = !!st && st.fuel <= 0 && s.active < s.stages.length - 1;
  const canSeparate = s.phase === "ascent" && s.lifted && s.active < s.stages.length - 1;
  const alt = Math.round(s.missionTime * s.velocity * 0.0006 + s.velocity * 0.02);
  const ast = s.asteroid;
  const sepLeft = spent && s.burnoutSince !== null ? Math.max(0, SEPARATION_GRACE - s.burnoutSince) : 0;

  return (
    <div className="pointer-events-none relative h-full select-none">
      {/* Top strip */}
      <div className="panel pointer-events-auto absolute left-1/2 top-3 w-[min(640px,calc(100%-1.5rem))] -translate-x-1/2 px-4 py-2.5">
        <div className="flex items-center justify-between gap-4 font-mono text-xs">
          <span className="hud-label text-primary">{mission.codename} · {mission.name}</span>
          <span className="tabular-nums text-muted-foreground">T+{fmt(s.missionTime)}s</span>
        </div>
        <div className="mt-2 flex items-end gap-4">
          <div>
            <div className="hud-label">Velocity</div>
            <div className="font-mono text-2xl font-semibold tabular-nums text-foreground">{fmt(s.velocity)}<span className="ml-1 text-xs text-muted-foreground">m/s</span></div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between font-mono text-[0.65rem] text-muted-foreground">
              <span>0</span>
              <span>MAX-Q</span>
              <span>TARGET {fmt(mission.requiredDv)}</span>
            </div>
            <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-secondary">
              <div className="absolute inset-y-0 left-[10%] w-[20%] bg-warning/25" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-destructive/70" />
              <div className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-100" style={{ width: `${Math.min(100, p * 100)}%` }} />
            </div>
          </div>
          <div className="text-right">
            <div className="hud-label">Altitude</div>
            <div className="font-mono text-lg tabular-nums text-foreground">{fmt(alt)}<span className="ml-1 text-xs text-muted-foreground">km</span></div>
          </div>
        </div>
      </div>

      {/* Countdown */}
      {s.phase === "countdown" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="brand text-[10rem] leading-none text-foreground/90">{Math.max(1, Math.ceil(COUNTDOWN - s.phaseTime))}</div>
        </div>
      )}

      {/* Throttle */}
      <div className="panel pointer-events-auto absolute bottom-24 left-3 top-36 flex w-24 flex-col items-center gap-2 py-3 md:bottom-6">
        <div className="hud-label">Throttle</div>
        <div className="font-mono text-lg font-semibold tabular-nums text-foreground">{Math.round(flightInput.throttle * 100)}%</div>
        <div className="relative flex flex-1 items-stretch">
          <SliderPrimitive.Root
            orientation="vertical"
            min={0}
            max={100}
            step={1}
            value={[Math.round(flightInput.throttle * 100)]}
            onValueChange={([v]) => (flightInput.throttle = (v ?? 100) / 100)}
            className="relative flex h-full w-8 touch-none select-none flex-col items-center"
            aria-label="Throttle"
          >
            <SliderPrimitive.Track className="relative w-3 grow overflow-hidden rounded-full bg-secondary">
              <SliderPrimitive.Range className="absolute w-full bg-primary" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className="block h-4 w-8 rounded-sm border border-primary bg-foreground shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </SliderPrimitive.Root>
          <div className="pointer-events-none absolute -right-2 left-[-6px] border-t border-dashed border-warning" style={{ bottom: `${MAXQ_SAFE_THROTTLE * 100}%` }} />
        </div>
        <div className="hud-label text-center leading-tight">W / S</div>
      </div>

      {/* Systems */}
      <div className="panel pointer-events-auto absolute right-3 top-36 w-64 p-3">
        <div className="hud-label">Stages</div>
        <div className="mt-2 space-y-1.5">
          {[...s.stages].map((stg, k) => ({ stg, k })).reverse().map(({ stg, k }) => (
            <div key={k} className={cn("rounded border px-2 py-1", !stg.attached ? "border-border/40 opacity-40" : k === s.active ? "border-primary/70" : "border-border")}>
              <div className="flex justify-between font-mono text-[0.7rem]">
                <span className="text-foreground">Stage {k + 1}{!stg.attached && " · jettisoned"}</span>
                <span className="tabular-nums text-muted-foreground">{stg.fuelMax ? Math.round((stg.fuel / stg.fuelMax) * 100) : 0}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className={cn("h-full", stg.fuel <= 0 ? "bg-destructive" : "bg-accent")} style={{ width: `${stg.fuelMax ? (stg.fuel / stg.fuelMax) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        <button
          disabled={!canSeparate}
          onClick={() => (flightInput.separateRequested = true)}
          className={cn(
            "mt-3 flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2.5 font-mono text-sm font-semibold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            spent ? "animate-alert border-destructive bg-destructive text-destructive-foreground" : "border-border bg-secondary text-foreground hover:border-primary",
          )}
        >
          <Unlink className="size-4" /> Separate {spent && `· ${sepLeft.toFixed(1)}s`}
        </button>
        <div className="mt-1 text-center font-mono text-[0.65rem] text-muted-foreground">Space</div>

        <div className="mt-3">
          <div className="flex justify-between">
            <span className="hud-label">Hull stress</span>
            <span className={cn("font-mono text-xs tabular-nums", s.stress > 60 ? "text-destructive" : "text-muted-foreground")}>{Math.round(s.stress)}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
            <div className={cn("h-full", s.stress > 60 ? "bg-destructive" : s.stress > 25 ? "bg-warning" : "bg-success")} style={{ width: `${Math.min(100, s.stress)}%` }} />
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="absolute left-1/2 top-40 flex -translate-x-1/2 flex-col items-center gap-2">
        {s.inMaxQ && s.phase === "ascent" && (
          <div className={cn("flex items-center gap-2 rounded-md border px-4 py-2 font-mono text-sm font-semibold uppercase", flightInput.throttle > MAXQ_SAFE_THROTTLE ? "animate-alert border-warning bg-warning/20 text-warning" : "border-warning/50 bg-panel text-warning")}>
            <TriangleAlert className="size-4" /> Max-Q · keep throttle ≤ 70%
          </div>
        )}
        {spent && s.phase === "ascent" && (
          <div className="animate-alert rounded-md border border-destructive bg-destructive/20 px-4 py-2 font-mono text-sm font-semibold uppercase text-destructive">
            Stage burnout · separate now
          </div>
        )}
        {ast.state === "incoming" && s.phase === "ascent" && (
          <div className="animate-alert flex flex-col items-center rounded-md border-2 border-destructive bg-destructive/25 px-6 py-3 text-center">
            <div className="brand text-2xl text-destructive">Asteroid inbound</div>
            <div className="mt-1 font-mono text-sm text-foreground">
              Rock drifting {ast.laneX > 0 ? "right" : "left"} of center · burn {ast.laneX > 0 ? "◀ A" : "D ▶"} · impact in {Math.max(0, ast.timeToImpact).toFixed(1)}s
            </div>
          </div>
        )}
        {s.phase === "ascent" && !s.lifted && (
          <div className="animate-alert rounded-md border border-destructive bg-destructive/20 px-4 py-2 font-mono text-sm font-semibold uppercase text-destructive">
            Engines straining · no liftoff
          </div>
        )}
        {s.phase === "approach" && (
          <div className="rounded-md border border-success bg-success/15 px-5 py-2 font-mono text-sm font-semibold uppercase text-success">
            Target velocity reached · approach
          </div>
        )}
      </div>

      {/* Lateral thrusters (touch) */}
      <div className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3">
        <HoldButton dir={-1} label="Lateral thrust left" />
        <div className="hud-label text-center">RCS<br />A / D</div>
        <HoldButton dir={1} label="Lateral thrust right" />
      </div>

      {/* Event log */}
      <div className="absolute bottom-6 right-3 hidden w-72 space-y-1 md:block">
        {s.events.slice(-4).map((e, i) => (
          <div
            key={`${e.t}-${i}`}
            className={cn(
              "rounded bg-panel px-2 py-1 font-mono text-[0.7rem] backdrop-blur",
              e.tone === "bad" && "text-destructive",
              e.tone === "warn" && "text-warning",
              e.tone === "good" && "text-success",
              e.tone === "info" && "text-muted-foreground",
            )}
          >
            T+{fmt(e.t)}s · {e.text}
          </div>
        ))}
      </div>
    </div>
  );
}
