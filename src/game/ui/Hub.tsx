import { ArrowRight, Check, Gauge, Orbit, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "../store";
import { MISSIONS, CORRIDOR_HINT } from "../sim/missions";
import { GRANT_AMOUNT, GRANT_THRESHOLD } from "../sim/economy";
import { CoinBadge, fmt } from "./common";
import { cn } from "@/lib/utils";

export function Hub() {
  const select = useGame((s) => s.selectMission);
  const setFocus = useGame((s) => s.setHubFocus);
  const completed = useGame((s) => s.completed);
  const coins = useGame((s) => s.coins);
  const grant = useGame((s) => s.grant);
  return (
    <div className="pointer-events-none flex h-full flex-col justify-center px-6 py-8 md:px-12">
      <div className="pointer-events-auto max-w-xl">
        <div className="hud-label text-primary">Launch Authority // Commercial Division</div>
        <h1 className="brand mt-2 text-6xl leading-[0.85] text-foreground md:text-8xl">
          Space<br />
          <span className="text-primary">Max</span>
        </h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground">
          Engineer the rocket. Tune the launch. Fly it yourself. Every contract pays in SpaceCoins, every explosion teaches you physics.
        </p>
      </div>

      <div className="pointer-events-auto mt-8 grid max-w-xl gap-3">
        {MISSIONS.map((m) => {
          const done = completed.includes(m.id);
          return (
            <article
              key={m.id}
              onMouseEnter={() => setFocus(m.id)}
              onMouseLeave={() => setFocus(null)}
              className="panel group p-4 transition-all hover:border-primary/70 hover:glow-primary"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="hud-label">{m.codename}</span>
                    <span className="flex gap-0.5" aria-label={`Difficulty ${m.difficulty} of 3`}>
                      {[1, 2, 3].map((d) => (
                        <span key={d} className={cn("h-1.5 w-3 rounded-sm", d <= m.difficulty ? "bg-primary" : "bg-border")} />
                      ))}
                    </span>
                    {done && (
                      <span className="hud-label inline-flex items-center gap-1 text-success">
                        <Check className="size-3" /> Completed
                      </span>
                    )}
                  </div>
                  <h2 className="brand mt-1 text-2xl text-foreground">{m.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{m.brief}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-foreground/85">
                    <span className="inline-flex items-center gap-1"><Target className="size-3.5 text-accent" />ΔV ≥ {fmt(m.requiredDv)} m/s</span>
                    <span className="inline-flex items-center gap-1"><Orbit className="size-3.5 text-accent" />Corridor {m.optimalAngle - CORRIDOR_HINT}–{m.optimalAngle + CORRIDOR_HINT}°</span>
                    <span className="inline-flex items-center gap-1"><Gauge className="size-3.5 text-accent" />TWR ≥ {m.recommendedTwr} rec.</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="text-right">
                    <div className="hud-label">Contract</div>
                    <CoinBadge amount={m.reward} className="text-lg" />
                  </div>
                  <Button onClick={() => select(m.id)} size="sm" className="font-semibold uppercase tracking-wide">
                    Accept <ArrowRight />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {coins < GRANT_THRESHOLD && (
        <div className="pointer-events-auto mt-4 flex max-w-xl items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <span className="text-foreground">Running low on funds? The agency will bail you out once in a while.</span>
          <Button variant="outline" size="sm" onClick={grant}>
            Request +{GRANT_AMOUNT} grant
          </Button>
        </div>
      )}
    </div>
  );
}
