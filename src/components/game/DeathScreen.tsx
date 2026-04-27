import { useEffect } from "react";
import { GameStats } from "@/game/engine";

export const DeathScreen = ({ stats, onRestart }: { stats: GameStats; onRestart: () => void }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r") onRestart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRestart]);

  const isSon = stats.rank.startsWith("SON");

  return (
    <div className="absolute inset-0 grid place-items-center bg-background/90 pixel-text">
      <div className="w-[min(560px,92vw)] p-6 border-2 border-destructive bg-card/95 text-center">
        <h1 className="text-destructive text-[20px] mb-1">YOU ARE DIED</h1>
        <div className="text-[10px] text-foreground/60 mb-6">press R to restart</div>

        <div className="text-[9px] text-foreground/60 mb-2">RANK</div>
        <div className={`text-[64px] leading-none mb-6 ${isSon ? "rank-son" : stats.rankColor}`}>
          {stats.rank}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-left mb-6">
          <Stat k="DISTANCE" v={`${Math.floor(stats.distance)} m`} />
          <Stat k="TIME" v={formatTime(stats.timeAlive)} />
          <Stat k="TOTAL DMG" v={Math.floor(stats.totalDamage).toString()} />
          <Stat k="KILLS" v={stats.kills.toString()} />
          <Stat k="BOSSES" v={stats.bossKills.toString()} />
          <Stat k="COINS" v={stats.coins.toString()} />
        </div>

        <button
          onClick={onRestart}
          className="w-full py-2.5 px-3 border-2 border-primary bg-primary/20 text-[hsl(var(--primary))] hover:bg-primary/40 text-[11px]"
        >
          ▶ RESTART (R)
        </button>
      </div>
    </div>
  );
};

const Stat = ({ k, v }: { k: string; v: string }) => (
  <>
    <div className="text-foreground/60">{k}</div>
    <div className="text-right text-[hsl(var(--primary))]">{v}</div>
  </>
);

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
