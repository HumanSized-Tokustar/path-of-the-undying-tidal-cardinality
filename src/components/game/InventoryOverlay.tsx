import { useState } from "react";
import { Game, GameStats } from "@/game/engine";
import { WEAPONS, WeaponId } from "@/game/weapons";

type Tab = "weapons" | "stats";
type Target = { kind: "ranged"; index: 0|1|2|3|4|5 } | { kind: "melee" } | { kind: "miscA" } | { kind: "miscB" };

export const InventoryOverlay = ({ game, stats }: { game: Game; stats: GameStats }) => {
  const [tab, setTab] = useState<Tab>("weapons");
  const [target, setTarget] = useState<Target>({ kind: "ranged", index: 0 });
  const inv = stats.inventory;

  const targetClass: "ranged" | "melee" | "misc" =
    target.kind === "ranged" ? "ranged" : target.kind === "melee" ? "melee" : "misc";
  const targetLabel =
    target.kind === "ranged" ? `RANGED [${target.index + 1}]` :
    target.kind === "melee"  ? "MELEE [R]" :
    target.kind === "miscA"  ? "MISC [O]" : "MISC [P]";

  const equip = (wid: WeaponId) => {
    const w = WEAPONS[wid];
    if (w.class !== targetClass) return;
    if (target.kind === "ranged") game.equipRangedSlot(wid, target.index);
    else if (target.kind === "melee") game.equipMelee(wid);
    else if (target.kind === "miscA") game.equipMisc(wid, "A");
    else if (target.kind === "miscB") game.equipMisc(wid, "B");
  };

  const SlotBtn = ({ wid, label, active, onClick, accent }: { wid: WeaponId; label: string; active: boolean; onClick: () => void; accent: string }) => (
    <button onClick={onClick}
      className={`w-[68px] h-[68px] border-2 flex flex-col items-center justify-center ${active ? "border-[#ffd84a]" : "border-[#3a4a72]"}`}
      style={{ boxShadow: active ? `inset 0 0 0 1px ${accent}` : undefined }}>
      <div className="text-[8px]" style={{ color: accent }}>{label}</div>
      <div className="text-[9px] mt-1 truncate w-full text-center" style={{ color: WEAPONS[wid].color }}>{WEAPONS[wid].name}</div>
    </button>
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center pixel-text">
      <div className="bg-[#0a0e1f]/95 border-2 border-[#ffd84a] p-5 w-[760px] max-w-[96vw] max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#ffd84a] text-[20px]" style={{ textShadow: "2px 2px 0 #1a2342" }}>INVENTORY</h2>
          <button onClick={() => game.resume()}
            className="text-[#fff7d6] text-[10px] border border-[#fff7d6]/60 px-2 py-1 hover:bg-[#fff7d6]/20">
            CLOSE (TAB)
          </button>
        </div>

        <div className="flex gap-2 mb-4 text-[10px]">
          {(["weapons", "stats"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1 border-2 ${tab === t ? "border-[#ffd84a] text-[#ffd84a]" : "border-[#3a4a72] text-[#fff7d6]/70"}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {tab === "weapons" && (
          <div>
            <div className="text-[#fff7d6] text-[9px] mb-2">EQUIPPED — click a slot to target, then click an owned weapon of matching class.</div>

            {/* RANGED row */}
            <div className="text-[8px] text-[#ffd166] mb-1">RANGED [1-6] · FIRE F</div>
            <div className="flex gap-2 mb-3 flex-wrap">
              {inv.ranged.map((wid, i) => (
                <SlotBtn key={i} wid={wid} label={`[${i+1}]`} accent="#ffd166"
                  active={target.kind === "ranged" && target.index === i}
                  onClick={() => setTarget({ kind: "ranged", index: i as 0|1|2|3|4|5 })} />
              ))}
            </div>

            {/* MELEE row */}
            <div className="text-[8px] text-[#d8e2ff] mb-1">MELEE [R]</div>
            <div className="flex gap-2 mb-3">
              <SlotBtn wid={inv.melee} label="[R]" accent="#d8e2ff"
                active={target.kind === "melee"}
                onClick={() => setTarget({ kind: "melee" })} />
            </div>

            {/* MISC row */}
            <div className="text-[8px] text-[#ff8c42] mb-1">MISC [O] [P] · hold to charge throw</div>
            <div className="flex gap-2 mb-4">
              <SlotBtn wid={inv.miscA} label="[O]" accent="#ff8c42"
                active={target.kind === "miscA"}
                onClick={() => setTarget({ kind: "miscA" })} />
              <SlotBtn wid={inv.miscB} label="[P]" accent="#ff8c42"
                active={target.kind === "miscB"}
                onClick={() => setTarget({ kind: "miscB" })} />
            </div>

            {/* ITEMS — single combined panel (replaces consumables tab) */}
            <div className="text-[8px] text-[#7be0ff] mb-1">ITEMS</div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button onClick={() => game.useMedkit()}
                className="border-2 border-[#3a4a72] hover:border-[#e84545] p-2 text-left">
                <div className="text-[#e84545] text-[10px]">MEDKIT × {inv.consumables.medkit}</div>
                <div className="text-[8px] text-[#fff7d6]/70 mt-1">+60 HP</div>
              </button>
              <button onClick={() => game.useAmmoPack()}
                className="border-2 border-[#3a4a72] hover:border-[#ffd84a] p-2 text-left">
                <div className="text-[#ffd84a] text-[10px]">AMMO × {inv.consumables.ammoPack}</div>
                <div className="text-[8px] text-[#fff7d6]/70 mt-1">+100 ammo</div>
              </button>
              <div className="border-2 border-[#3a4a72] p-2">
                <div className="text-[#7be0ff] text-[10px]">GRENADES × {stats.grenades}</div>
                <div className="text-[8px] text-[#fff7d6]/70 mt-1">Misc throw</div>
              </div>
            </div>

            <div className="text-[#fff7d6] text-[9px] mb-2">
              OWNED — click to equip into <span className="text-[#ffd84a]">{targetLabel}</span> ({targetClass.toUpperCase()})
            </div>
            <div className="grid grid-cols-4 gap-2">
              {inv.owned.map((wid: WeaponId) => {
                const w = WEAPONS[wid];
                const ok = w.class === targetClass;
                return (
                  <button key={wid} onClick={() => equip(wid)} disabled={!ok}
                    className={`border-2 p-2 text-left ${ok ? "border-[#3a4a72] hover:border-[#ffd84a]" : "border-[#3a4a72]/30 opacity-40 cursor-not-allowed"}`}>
                    <div className="text-[10px]" style={{ color: w.color }}>{w.name}</div>
                    <div className="text-[8px] text-[#fff7d6]/70 mt-1">DMG {w.dmg} • CD {w.fireCd}s</div>
                    <div className="text-[8px] text-[#fff7d6]/50 mt-1">{w.desc}</div>
                    <div className="text-[7px] mt-1" style={{ color: ok ? "#7bff8a" : "#ff6a6a" }}>{w.class.toUpperCase()}</div>
                  </button>
                );
              })}
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
            <div>Difficulty: <span className="text-[#ffd84a]">{stats.difficulty.toUpperCase()}</span> (locked mid-run)</div>
            <div>Rank: <span className={stats.rankColor}>{stats.rank}</span></div>
          </div>
        )}
      </div>
    </div>
  );
};
