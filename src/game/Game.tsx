import { useEffect } from "react";
import { useGame } from "./store";
import { flightRuntime } from "./runtime";
import { GameCanvas } from "./scene/GameCanvas";
import { TopBar } from "./ui/common";
import { Hub } from "./ui/Hub";
import { HangarUI } from "./ui/Hangar";
import { ConsoleUI } from "./ui/Console";
import { FlightHud } from "./ui/FlightHud";
import { Debrief } from "./ui/Debrief";

export function Game() {
  const screen = useGame((s) => s.screen);

  useEffect(() => {
    // A reload mid-flight returns to the console instead of a dead flight.
    const s = useGame.getState().screen;
    if (s === "flight" || s === "debrief") useGame.setState({ screen: "console" });
    if (import.meta.env.DEV) (window as unknown as { __game: unknown }).__game = { store: useGame, flight: flightRuntime };
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background text-foreground">
      <GameCanvas />
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        {screen !== "flight" && <TopBar />}
        <div className="relative min-h-0 flex-1">
          {screen === "hub" && <Hub />}
          {screen === "hangar" && <HangarUI />}
          {screen === "console" && <ConsoleUI />}
          {screen === "flight" && <FlightHud />}
          {screen === "debrief" && <Debrief />}
        </div>
      </div>
    </main>
  );
}
