import { GameStats } from "@/game/engine";
import { WEAPONS } from "@/game/weapons";

export const Hud = ({ stats }: { stats: GameStats }) => {
  const hpPct = Math.max(0, (stats.hp / stats.maxHp) * 100);
  const odPct = stats.overdriveBar * 100;
  const miscCount = (stats as any).miscAmmo ?? stats.grenades ?? 0;
  const lives = (stats as any).lives ?? 3;
  const inv: any = stats.inventory ?? { ranged: ["pistol","smg","shotgun","rifle","minigun","rocket"], melee: "knife", miscA: "grenade", miscB: "smoke", activeRanged: 0 };
  const ranged = inv.ranged ?? [inv.loadout?.[0], inv.loadout?.[1], inv.loadout?.[2]];
  const active = inv.activeRanged ?? inv.active ?? 0;
  const meleeId = inv.melee ?? "knife";
  const miscAId = inv.miscA ?? "grenade";
  const miscBId = inv.miscB ?? "smoke";

  return (
    <div className="pointer-events-none absolute inset-0 pixel-text text-[10px] md:text-[11px]">
      {/* Top-left bars */}
      <div className="absolute top-3 left-3 space-y-1.5 w-[280px]">
        <SegBar label={`HP ${Math.ceil(stats.hp)}/${stats.maxHp}`} pct={hpPct} color="hsl(var(--hud-hp))" />
        <SegBar
          label={stats.shieldActive ? `SHIELD ${stats.shieldCd.toFixed(1)}s` : stats.shieldCd > 0 ? `CD ${stats.shieldCd.toFixed(1)}s` : "SHIELD READY (I)"}
          pct={stats.shieldActive ? 100 : ((6 - stats.shieldCd) / 6) * 100}
          color="hsl(var(--hud-shield))"
        />
        <SegBar
          label={stats.overdriveActive ? `OVERDRIVE ${stats.overdriveTime.toFixed(1)}s` : `OVERDRIVE (F) ${odPct.toFixed(0)}%`}
          pct={stats.overdriveActive ? (stats.overdriveTime / 6) * 100 : odPct}
          color="hsl(var(--hud-overdrive))"
        />
        <div className="flex gap-2 text-[#ffd84a] mt-1">
          <span>AMMO {stats.ammo}</span>
          <span>● MISC {miscCount}</span>
          <span>● DASH {stats.dashCharges}/2</span>
          <span className="text-[#7be0ff]">● ROLL {(stats as any).rollCharges ?? 2}/2</span>
        </div>
        <div className="flex gap-1 mt-1">
          <span className="text-[9px] text-[#fff7d6] mr-1">LIVES</span>
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="text-[12px]" style={{ color: i < lives ? "#ff5a5a" : "#3a4a72", textShadow: i < lives ? "0 0 6px rgba(255,90,90,0.7)" : "none" }}>♥</span>
          ))}
        </div>
      </div>

      {/* Top-center distance / timer */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 text-center">
        <div className="text-[#ffd84a] text-[16px]" style={{ textShadow: "2px 2px 0 #0a0e1f" }}>
          {Math.floor(stats.distance)} m
        </div>
        <div className="text-[#fff7d6]/70 text-[9px]">{formatTime(stats.timeAlive)}</div>
      </div>

      {/* Top-right currencies */}
      <div className="absolute top-3 right-3 text-right space-y-1">
        <div style={{ color: "#ffd84a" }}>◆ {stats.coins} COINS</div>
        <div style={{ color: "#7be0ff" }}>◆ {stats.tokens} TOKENS</div>
        <div style={{ color: "#d97bff" }}>◆ {stats.crystals} CRYSTALS</div>
        <div className="text-[#fff7d6]/70 mt-2 text-[9px]">♪ {stats.trackName}</div>
      </div>

      {/* Warning */}
      {stats.warning && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-destructive/80 text-destructive-foreground animate-pulse">
          ! {stats.warning} !
        </div>
      )}

      {/* Combo + dmg */}
      {stats.comboCount > 1 && (
        <div className="absolute top-1/2 right-6 -translate-y-1/2 text-right">
          <div className="text-[hsl(var(--accent))] text-[24px]">x{stats.comboCount}</div>
          <div className="text-[#fff7d6]/70 text-[10px]">COMBO</div>
        </div>
      )}
      {stats.damageRecent > 0 && (
        <div className="absolute top-1/2 right-6 translate-y-6 text-right text-[hsl(var(--primary))]">
          +{Math.floor(stats.damageRecent)} DMG
        </div>
      )}

      <div className="absolute bottom-20 left-3 text-[#fff7d6]/80">
        TOTAL DMG: {Math.floor(stats.totalDamage)} ● KILLS: {stats.kills} ● BOSSES: {stats.bossKills}
      </div>

      {/* Hotbar — 6 ranged + 1 melee + 2 misc */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3 items-end">
        <div className="flex gap-1.5">
          {ranged.slice(0, 6).map((wid: any, i: number) => {
            const w = WEAPONS[wid] ?? WEAPONS.pistol;
            const isActive = i === active;
            return (
              <div key={i}
                className={`w-12 h-14 border-2 flex flex-col items-center justify-center ${isActive ? "border-[#ffd84a] bg-[#1a2342]/90 shadow-[0_0_10px_rgba(255,216,74,0.6)]" : "border-[#3a4a72] bg-[#0a0e1f]/80"}`}>
                <div className="text-[8px] text-[#fff7d6]">[{i + 1}]</div>
                <div className="text-[8px] mt-0.5" style={{ color: w.color }}>{w.name.slice(0, 6).toUpperCase()}</div>
              </div>
            );
          })}
        </div>
        <div className="w-12 h-14 border-2 border-[#a83af0] bg-[#0a0e1f]/80 flex flex-col items-center justify-center">
          <div className="text-[8px] text-[#fff7d6]">[L]</div>
          <div className="text-[8px] mt-0.5" style={{ color: WEAPONS[meleeId]?.color }}>{(WEAPONS[meleeId]?.name ?? "KNIFE").slice(0,6).toUpperCase()}</div>
        </div>
        <div className="flex gap-1.5">
          <div className="w-12 h-14 border-2 border-[#7be0ff] bg-[#0a0e1f]/80 flex flex-col items-center justify-center">
            <div className="text-[8px] text-[#fff7d6]">[K]</div>
            <div className="text-[8px] mt-0.5" style={{ color: WEAPONS[miscAId]?.color }}>{(WEAPONS[miscAId]?.name ?? "GRENADE").slice(0,6).toUpperCase()}</div>
          </div>
          <div className="w-12 h-14 border-2 border-[#7be0ff] bg-[#0a0e1f]/80 flex flex-col items-center justify-center">
            <div className="text-[8px] text-[#fff7d6]">[O]</div>
            <div className="text-[8px] mt-0.5" style={{ color: WEAPONS[miscBId]?.color }}>{(WEAPONS[miscBId]?.name ?? "SMOKE").slice(0,6).toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* Charge meter when throwing misc */}
      {stats.miscCharge > 0.05 && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-40 h-2 bg-[#0a0e1f] border border-[#ffd84a]">
          <div className="h-full bg-[#ffd84a]" style={{ width: `${Math.min(100, stats.miscCharge * 100)}%` }} />
        </div>
      )}

      {/* Bottom description bar — matches reference video */}
      <div className="absolute bottom-0 left-0 right-0 h-9 bg-[#0a0e1f]/90 border-t-2 border-[#ffd84a] flex items-center px-3">
        <div className="text-[#fff7d6] text-[10px] truncate">{stats.description}</div>
      </div>
    </div>
  );
};

const SegBar = ({ label, pct, color }: { label: string; pct: number; color: string }) => (
  <div>
    <div className="text-[9px] text-[#fff7d6] mb-0.5" style={{ textShadow: "1px 1px 0 #0a0e1f" }}>{label}</div>
    <div className="h-3.5 w-full bg-[#0a0e1f] border-2 border-[#3a4a72] relative overflow-hidden">
      <div className="h-full transition-[width] duration-100" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
      {/* segment dividers */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 18px, rgba(0,0,0,0.4) 18px 19px)" }} />
    </div>
  </div>
);

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
