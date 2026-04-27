import { useState } from "react";
import { Game, GameStats } from "@/game/engine";
import { WEAPONS, WeaponId } from "@/game/weapons";

type Tab = "weapons" | "consumables" | "stats";

export const InventoryOverlay = ({ game, stats }: { game: Game; stats: GameStats }) => {
  const [tab, setTab] = useState<Tab>("weapons");
  const [equipSlot, setEquipSlot] = useState<0 | 1 | 2>(0);

  return (
    <div className="absolute inset-0 flex items-center justify-center pixel-text">
      <div className="bg-[#0a0e1f]/95 border-2 border-[#ffd84a] p-6 w-[640px] max-w-[95vw]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#ffd84a] text-[20px]" style={{ textShadow: "2px 2px 0 #1a2342" }}>INVENTORY</h2>
          <button onClick={() => game.resume()}
            className="text-[#fff7d6] text-[10px] border border-[#fff7d6]/60 px-2 py-1 hover:bg-[#fff7d6]/20">
            CLOSE (Y)
          </button>
        </div>

        <div className="flex gap-2 mb-4 text-[10px]">
          {(["weapons", "consumables", "stats"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1 border-2 ${tab === t ? "border-[#ffd84a] text-[#ffd84a]" : "border-[#3a4a72] text-[#fff7d6]/70"}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {tab === "weapons" && (
          <div>
            <div className="text-[#fff7d6] text-[9px] mb-2">EQUIPPED LOADOUT (click slot to target it):</div>
            <div className="flex gap-2 mb-4">
              {stats.inventory.loadout.map((wid, i) => (
                <button key={i} onClick={() => setEquipSlot(i as 0|1|2)}
                  className={`w-20 h-20 border-2 flex flex-col items-center justify-center ${equipSlot === i ? "border-[#ffd84a]" : "border-[#3a4a72]"}`}>
                  <div className="text-[8px] text-[#fff7d6]">[{i + 1}]</div>
                  <div className="text-[9px] mt-1" style={{ color: WEAPONS[wid].color }}>{WEAPONS[wid].name}</div>
                </button>
              ))}
            </div>
            <div className="text-[#fff7d6] text-[9px] mb-2">OWNED — click to equip into slot {equipSlot + 1}:</div>
            <div className="grid grid-cols-4 gap-2">
              {stats.inventory.owned.map((wid: WeaponId) => {
                const w = WEAPONS[wid];
                return (
                  <button key={wid} onClick={() => game.equipToSlot(wid, equipSlot)}
                    className="border-2 border-[#3a4a72] p-2 text-left hover:border-[#ffd84a]">
                    <div className="text-[10px]" style={{ color: w.color }}>{w.name}</div>
                    <div className="text-[8px] text-[#fff7d6]/70 mt-1">DMG {w.dmg} • CD {w.fireCd}s</div>
                    <div className="text-[8px] text-[#fff7d6]/50 mt-1">{w.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "consumables" && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => game.useMedkit()}
              className="border-2 border-[#3a4a72] hover:border-[#e84545] p-3 text-left">
              <div className="text-[#e84545] text-[12px]">MEDKIT × {stats.inventory.consumables.medkit}</div>
              <div className="text-[8px] text-[#fff7d6]/70 mt-1">+60 HP. Click to use.</div>
            </button>
            <button onClick={() => game.useAmmoPack()}
              className="border-2 border-[#3a4a72] hover:border-[#ffd84a] p-3 text-left">
              <div className="text-[#ffd84a] text-[12px]">AMMO PACK × {stats.inventory.consumables.ammoPack}</div>
              <div className="text-[8px] text-[#fff7d6]/70 mt-1">+100 ammo. Click to use.</div>
            </button>
            <div className="border-2 border-[#3a4a72] p-3">
              <div className="text-[#7be0ff] text-[12px]">GRENADES × {stats.grenades}</div>
              <div className="text-[8px] text-[#fff7d6]/70 mt-1">Throw with K.</div>
            </div>
          </div>
        )}

        {tab === "stats" && (
          <div className="space-y-1 text-[10px] text-[#fff7d6]">
            <div>HP: {Math.ceil(stats.hp)} / {stats.maxHp}</div>
            <div>Distance: {Math.floor(stats.distance)} m</div>
            <div>Time alive: {Math.floor(stats.timeAlive)}s</div>
            <div>Total damage: {Math.floor(stats.totalDamage)}</div>
            <div>Kills: {stats.kills}  •  Bosses: {stats.bossKills}</div>
            <div>Coins: {stats.coins}  •  Tokens: {stats.tokens}  •  Crystals: {stats.crystals}</div>
            <div>Rank: <span className={stats.rankColor}>{stats.rank}</span></div>
          </div>
        )}
      </div>
    </div>
  );
};
