import { Coins, Volume2, VolumeX } from "lucide-react";
import { useGame, type Screen } from "../store";
import { cn } from "@/lib/utils";

export const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });

export function CoinBadge({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono font-semibold tabular-nums text-warning", className)}>
      <Coins className="size-4" aria-hidden />
      {fmt(amount)}
    </span>
  );
}

const STEPS: { id: Screen; label: string }[] = [
  { id: "hub", label: "Mission Hub" },
  { id: "hangar", label: "Hangar" },
  { id: "console", label: "MultiSim" },
  { id: "flight", label: "Flight" },
  { id: "debrief", label: "Debrief" },
];

export function TopBar() {
  const coins = useGame((s) => s.coins);
  const screen = useGame((s) => s.screen);
  const muted = useGame((s) => s.muted);
  const toggleMute = useGame((s) => s.toggleMute);
  const setScreen = useGame((s) => s.setScreen);
  const idx = STEPS.findIndex((s) => s.id === screen);
  return (
    <header className="pointer-events-auto flex items-center gap-4 border-b border-border bg-panel-strong px-4 py-2.5 backdrop-blur">
      <button onClick={() => screen !== "flight" && setScreen("hub")} className="brand text-xl leading-none text-foreground" aria-label="Space Max home">
        Space<span className="text-primary">Max</span>
      </button>
      <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Mission progress">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1">
            <span className={cn("hud-label rounded px-2 py-1", i === idx && "bg-primary/15 text-primary", i < idx && "text-foreground")}>
              {String(i + 1).padStart(2, "0")} {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" />}
          </div>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5">
          <span className="hud-label hidden sm:inline">SpaceCoins</span>
          <CoinBadge amount={coins} />
        </div>
        <button onClick={toggleMute} className="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground" aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>
    </header>
  );
}

export function Stat({ label, value, unit, tone }: { label: string; value: string; unit?: string | undefined; tone?: "primary" | "accent" | "warn" | "bad" | "good" | undefined }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2">
      <div className="hud-label">{label}</div>
      <div
        className={cn(
          "font-mono text-lg font-semibold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "accent" && "text-accent",
          tone === "warn" && "text-warning",
          tone === "bad" && "text-destructive",
          tone === "good" && "text-success",
        )}
      >
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
