import { useState } from "react";
import { Game, GameStats } from "@/game/engine";
import { MAIN_SHOP, ALLIES, AUGMENT_SHOP, ShopItem, AllyDef, AugmentDef } from "@/game/shops";

type ShopKind = "main" | "ally" | "shady";

export const ShopOverlay = ({ game, stats, kind }: { game: Game; stats: GameStats; kind: ShopKind }) => {
  const [page, setPage] = useState(0);
  const title = kind === "main" ? "MAIN SHOP" : kind === "ally" ? "ALLY RECRUITMENT" : "AUGMENT SHOP (SHADY GUY)";
  const accent = kind === "main" ? "#ffd84a" : kind === "ally" ? "#7bff8a" : "#d97bff";

  const canAfford = (cost: number, cur: "coins"|"tokens"|"crystals") =>
    (cur === "coins" ? stats.coins : cur === "tokens" ? stats.tokens : stats.crystals) >= cost;

  const buyItem = (it: ShopItem) => { if (canAfford(it.cost, it.currency)) game.buyMainItem(it.id); };
  const buyAlly = (a: AllyDef) => { if (canAfford(a.cost, a.currency)) game.buyAlly(a.id); };
  const buyAug = (a: AugmentDef) => { if (canAfford(a.cost, a.currency)) game.buyAugment(a.id); };

  const Currency = ({ v, c }: { v: number; c: string }) => (
    <span className="text-[10px]" style={{ color: c }}>{v}</span>
  );

  // Pagination for main shop (8 per page)
  const PAGE_SIZE = 8;
  const pages = kind === "main" ? Math.max(1, Math.ceil(MAIN_SHOP.length / PAGE_SIZE))
              : kind === "shady" ? Math.max(1, Math.ceil(AUGMENT_SHOP.length / PAGE_SIZE))
              : 1;

  return (
    <div className="absolute inset-0 flex items-center justify-center pixel-text">
      <div className="bg-[#0a0e1f]/95 border-2 p-5 w-[820px] max-w-[96vw] max-h-[92vh] overflow-auto"
           style={{ borderColor: accent }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[18px]" style={{ color: accent, textShadow: "2px 2px 0 #1a2342" }}>{title}</h2>
          <div className="flex gap-3 items-center">
            <div className="text-[10px]"><Currency v={stats.coins} c="#ffd84a" /> <span className="text-[#fff7d6]/60">COINS</span></div>
            <div className="text-[10px]"><Currency v={stats.tokens} c="#7be0ff" /> <span className="text-[#fff7d6]/60">TOK</span></div>
            <div className="text-[10px]"><Currency v={stats.crystals} c="#d97bff" /> <span className="text-[#fff7d6]/60">CRYS</span></div>
            <button onClick={() => game.resume()}
              className="text-[#fff7d6] text-[10px] border border-[#fff7d6]/60 px-2 py-1 hover:bg-[#fff7d6]/20">
              LEAVE (T/ESC)
            </button>
          </div>
        </div>

        {kind === "main" && (
          <>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {MAIN_SHOP.slice(page * PAGE_SIZE, (page+1) * PAGE_SIZE).map(it => {
                const ok = canAfford(it.cost, it.currency);
                return (
                  <button key={it.id} onClick={() => buyItem(it)} disabled={!ok}
                    className={`border-2 p-2 text-left h-[100px] ${ok ? "border-[#3a4a72] hover:border-[#ffd84a]" : "border-[#3a4a72]/30 opacity-40"}`}>
                    <div className="text-[10px]" style={{ color: it.color }}>{it.name}</div>
                    <div className="text-[8px] text-[#fff7d6]/60 mt-1 line-clamp-3">{it.desc}</div>
                    <div className="text-[9px] mt-2" style={{ color: it.currency === "coins" ? "#ffd84a" : it.currency === "tokens" ? "#7be0ff" : "#d97bff" }}>
                      {it.cost} {it.currency.toUpperCase()}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {kind === "shady" && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {AUGMENT_SHOP.slice(page * PAGE_SIZE, (page+1) * PAGE_SIZE).map(a => {
              const ok = canAfford(a.cost, a.currency);
              const owned = stats.inventory.augments.includes(a.id);
              return (
                <button key={a.id} onClick={() => buyAug(a)} disabled={!ok || owned}
                  className={`border-2 p-2 text-left h-[110px] ${owned ? "border-[#7bff8a]/60 opacity-60" : ok ? "border-[#3a4a72] hover:border-[#d97bff]" : "border-[#3a4a72]/30 opacity-40"}`}>
                  <div className="text-[10px]" style={{ color: a.color }}>{a.name}</div>
                  <div className="text-[7px] mt-1" style={{ color: a.color }}>{a.tier}</div>
                  <div className="text-[8px] text-[#fff7d6]/60 mt-1 line-clamp-3">{a.desc}</div>
                  <div className="text-[9px] mt-1" style={{ color: a.currency === "coins" ? "#ffd84a" : a.currency === "tokens" ? "#7be0ff" : "#d97bff" }}>
                    {owned ? "OWNED" : `${a.cost} ${a.currency.toUpperCase()}`}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {kind === "ally" && (
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
            {ALLIES.map(a => {
              const ok = canAfford(a.cost, a.currency);
              return (
                <div key={a.id} className="min-w-[200px] border-2 border-[#3a4a72] p-3 flex flex-col">
                  {/* Sprite preview */}
                  <div className="h-[80px] flex items-center justify-center mb-2 bg-[#05070f]">
                    <div style={{
                      width: a.w * 1.6, height: a.h * 1.6,
                      background: a.color,
                      borderBottom: `4px solid ${a.accent}`,
                      position: "relative",
                      boxShadow: `inset 0 -6px 0 ${a.accent}`,
                    }}>
                      <div style={{ position:"absolute", top:"20%", left:"30%", width:6, height:6, background:a.eye }} />
                      <div style={{ position:"absolute", top:"20%", right:"30%", width:6, height:6, background:a.eye }} />
                    </div>
                  </div>
                  <div className="text-[11px]" style={{ color: a.accent }}>{a.name}</div>
                  <div className="text-[8px] text-[#fff7d6]/60 mb-1">{a.role} · HP {a.hp} · DMG {a.dmg}</div>
                  <div className="text-[8px] text-[#fff7d6]/80 flex-1">{a.desc}</div>
                  <div className="text-[8px] mt-1" style={{ color: a.eye }}>▸ {a.ability}</div>
                  <button onClick={() => buyAlly(a)} disabled={!ok}
                    className={`mt-2 text-[9px] border px-2 py-1 ${ok ? "border-[#7bff8a] text-[#7bff8a] hover:bg-[#7bff8a]/20" : "border-[#3a4a72]/50 text-[#fff7d6]/40"}`}>
                    RECRUIT · {a.cost} {a.currency.toUpperCase()}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {(kind === "main" || kind === "shady") && pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-2 text-[10px]">
            <button onClick={() => setPage(p => Math.max(0, p-1))} className="border border-[#fff7d6]/60 px-2 py-1 hover:bg-[#fff7d6]/20">◀ PREV</button>
            <div className="text-[#fff7d6]/70">PAGE {page+1} / {pages}</div>
            <button onClick={() => setPage(p => Math.min(pages-1, p+1))} className="border border-[#fff7d6]/60 px-2 py-1 hover:bg-[#fff7d6]/20">NEXT ▶</button>
          </div>
        )}
      </div>
    </div>
  );
};
