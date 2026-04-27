import { GameStats } from "@/game/engine";

export const Hud = ({ stats }: { stats: GameStats }) => {
  const hpPct = Math.max(0, (stats.hp / stats.maxHp) * 100);
  const odPct = stats.overdriveBar * 100;
  return (
    <div className="pointer-events-none absolute inset-0 p-3 pixel-text text-[10px] md:text-[11px]">
      {/* Top-left: HP / Shield / Overdrive */}
      <div className="absolute top-3 left-3 space-y-1.5 w-[260px]">
        <Bar label={`HP  ${Math.ceil(stats.hp)}/${stats.maxHp}`} pct={hpPct} color="hsl(var(--hud-hp))" />
        <Bar
          label={stats.shieldActive ? `SHIELD ${stats.shieldCd.toFixed(1)}s` : stats.shieldCd > 0 ? `CD ${stats.shieldCd.toFixed(1)}s` : "SHIELD READY (I)"}
          pct={stats.shieldActive ? 100 : ((6 - stats.shieldCd) / 6) * 100}
          color="hsl(var(--hud-shield))"
        />
        <Bar
          label={stats.overdriveActive ? `OVERDRIVE ${stats.overdriveTime.toFixed(1)}s` : `OVERDRIVE (F) ${odPct.toFixed(0)}%`}
          pct={stats.overdriveActive ? (stats.overdriveTime / 6) * 100 : odPct}
          color="hsl(var(--hud-overdrive))"
        />
        <div className="flex gap-2 text-[hsl(var(--hud-gold))]">
          <span>AMMO {stats.ammo}</span>
          <span>● GREN {stats.grenades}</span>
          <span>● DASH {stats.dashCharges}/2</span>
        </div>
      </div>

      {/* Top-right: currencies + stats */}
      <div className="absolute top-3 right-3 text-right space-y-1">
        <div className="text-[hsl(var(--coin,45_95%_55%))]" style={{ color: "#ffd84a" }}>◆ {stats.coins} COINS</div>
        <div style={{ color: "#7be0ff" }}>◆ {stats.tokens} TOKENS</div>
        <div style={{ color: "#d97bff" }}>◆ {stats.crystals} CRYSTALS</div>
        <div className="text-foreground/80 mt-2">{Math.floor(stats.distance)} m</div>
        <div className="text-foreground/60">{formatTime(stats.timeAlive)}</div>
        <div className="text-foreground/60">♪ {stats.trackName}</div>
      </div>

      {/* Center-top: warning */}
      {stats.warning && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-destructive/80 text-destructive-foreground animate-pulse">
          ! {stats.warning} !
        </div>
      )}

      {/* Combo + dmg counters */}
      {stats.comboCount > 1 && (
        <div className="absolute top-1/2 right-6 -translate-y-1/2 text-right">
          <div className="text-[hsl(var(--accent))] text-[24px]">x{stats.comboCount}</div>
          <div className="text-foreground/70 text-[10px]">COMBO</div>
        </div>
      )}
      {stats.damageRecent > 0 && (
        <div className="absolute top-1/2 right-6 translate-y-6 text-right text-[hsl(var(--primary))]">
          +{Math.floor(stats.damageRecent)} DMG
        </div>
      )}

      {/* Total damage / kills bottom-left, above description bar */}
      <div className="absolute bottom-10 left-3 text-foreground/80">
        TOTAL DMG: {Math.floor(stats.totalDamage)} ● KILLS: {stats.kills} ● BOSSES: {stats.bossKills}
      </div>
    </div>
  );
};

const Bar = ({ label, pct, color }: { label: string; pct: number; color: string }) => (
  <div>
    <div className="text-[9px] text-foreground/80 mb-0.5">{label}</div>
    <div className="h-3 w-full bg-muted border border-border">
      <div className="h-full transition-[width] duration-100" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  </div>
);

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
