import { useEffect, useRef, useState } from "react";
import { Game, GameStats, Phase } from "@/game/engine";
import { audio } from "@/game/audio";
import { Hud } from "@/components/game/Hud";
import { StartScreen } from "@/components/game/StartScreen";
import { DeathScreen } from "@/components/game/DeathScreen";
import { PauseOverlay } from "@/components/game/PauseOverlay";
import { InventoryOverlay } from "@/components/game/InventoryOverlay";

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [stats, setStats] = useState<GameStats | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const g = new Game(canvasRef.current, {
      onStatsChange: setStats,
      onPhaseChange: setPhase,
    });
    gameRef.current = g;
    return () => g.destroy();
  }, []);

  const handleStart = () => { audio.init(); gameRef.current?.start(); };
  const handleRestart = () => { gameRef.current?.goToMenu(); };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-background">
      <h1 className="sr-only">Path of the Undying Tidal Cardinality — Endless Pixel Shooter</h1>
      <div className="absolute inset-0 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          className="max-w-full max-h-full w-auto h-auto"
          style={{ aspectRatio: "16/9", width: "100vw", height: "100vh", objectFit: "contain" }}
        />
      </div>

      {(phase === "playing" || phase === "paused" || phase === "inventory") && stats && <Hud stats={stats} />}
      {phase === "menu" && <StartScreen onStart={handleStart} />}
      {phase === "dead" && stats && <DeathScreen stats={stats} onRestart={handleRestart} />}
      {phase === "paused" && gameRef.current && <PauseOverlay game={gameRef.current} />}
      {phase === "inventory" && gameRef.current && stats && <InventoryOverlay game={gameRef.current} stats={stats} />}
    </main>
  );
};

export default Index;
