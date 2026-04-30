import { useEffect, useMemo, useRef, useState } from "react";
import { Game, GameStats } from "@/game/engine";
import { MAIN_SHOP, ALLIES, AUGMENT_SHOP, ShopItem, AllyDef, AugmentDef } from "@/game/shops";
import { STATUS_AUGMENTS } from "@/game/engine";
import { audio } from "@/game/audio";

type ShopKind = "main" | "ally" | "shady";
const PAGE_SIZE = 6;

export const ShopOverlay = ({ game, stats, kind }: { game: Game; stats: GameStats; kind: ShopKind }) => {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const palette = kind === "main"
    ? { bg: "#1a3aa8", header: "#ffd84a", border: "#ffd84a", text: "#fff7d6", accent: "#ffd84a" }
    : kind === "ally"
    ? { bg: "#1d6a3a", header: "#7bff8a", border: "#7bff8a", text: "#fff7d6", accent: "#7bff8a" }
    : { bg: "#3a1a6a", header: "#d97bff", border: "#d97bff", text: "#fff7d6", accent: "#d97bff" };
  const title = kind === "main" ? "MAIN SHOP" : kind === "ally" ? "ALLY SHOP" : "AUGMENT SHOP (UPGRADE)";

  const canAfford = (cost: number, cur: "coins"|"tokens"|"crystals") =>
    (cur === "coins" ? stats.coins : cur === "tokens" ? stats.tokens : stats.crystals) >= cost;

  const buyItem = (it: ShopItem) => { if (canAfford(it.cost, it.currency) && game.canBuyMainItem(it.id)) game.buyMainItem(it.id); };
  const buyAlly = (a: AllyDef) => { if (canAfford(a.cost, a.currency)) game.buyAlly(a.id); };
  const buyAug = (a: AugmentDef) => { if (canAfford(a.cost, a.currency) && game.canBuyAugment(a.id)) game.buyAugment(a.id); };
  const buyStatus = (sid: string, cost: number) => { if (canAfford(cost, "crystals") && game.canBuyStatusAugment(sid)) game.buyStatusAugment(sid, cost); };

  // Pagination
  const list = kind === "main" ? MAIN_SHOP : kind === "shady" ? AUGMENT_SHOP : [];
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const visible = list.slice(page * PAGE_SIZE, (page+1) * PAGE_SIZE);

  // ENTER triggers buy on selected card; ESC/T closes (engine also handles ESC).
  const lastSelected = useRef(selected);
  lastSelected.current = selected;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const id = lastSelected.current;
        if (!id) return;
        e.preventDefault();
        if (kind === "main") {
          const it = MAIN_SHOP.find(x => x.id === id); if (it) buyItem(it);
        } else if (kind === "ally") {
          const a = ALLIES.find(x => x.id === id); if (a) buyAlly(a);
        } else {
          const stat = STATUS_AUGMENTS.find(s => `status:${s.id}` === id);
          if (stat) { buyStatus(stat.id, stat.cost); return; }
          const a = AUGMENT_SHOP.find(x => x.id === id); if (a) buyAug(a);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kind, stats]); // re-bind when stats change so canAfford is fresh

  const Header = () => (
    <div className="flex items-center justify-between px-3 py-2 border-b-2" style={{ borderColor: palette.border, background: "#0a0e1f" }}>
      <h2 className="text-[14px] tracking-wider" style={{ color: palette.header, textShadow: "2px 2px 0 #000" }}>{title}</h2>
      <div className="flex gap-3 items-center text-[10px]">
        {kind === "main" && <span style={{ color: "#ffd84a" }}>COINS LEFT: {Math.floor(stats.coins)}</span>}
        {kind === "ally" && <span style={{ color: "#7be0ff" }}>TOKENS LEFT: {stats.tokens}</span>}
        {kind === "shady" && <span style={{ color: "#d97bff" }}>CRYSTALS LEFT: {stats.crystals}</span>}
        <button onClick={() => game.resume()}
          className="border px-2 py-0.5 hover:bg-white/20" style={{ borderColor: palette.text, color: palette.text }}>
          EXIT
        </button>
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center pixel-text bg-black/60 p-3">
      <div className="border-4 w-[min(96vw,920px)] max-h-[94vh] flex flex-col"
           style={{ borderColor: palette.border, background: palette.bg, boxShadow: `0 0 0 4px #0a0e1f` }}>
        <Header />

        <div className="p-4 flex-1 overflow-auto">

          {kind === "main" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {visible.map(it => {
                  const ok = canAfford(it.cost, it.currency) && game.canBuyMainItem(it.id);
                  const sel = selected === it.id;
                  return (
                    <button key={it.id}
                      onClick={() => { setSelected(it.id); if (sel) buyItem(it); }}
                      disabled={!ok}
                      className={`border-4 p-2 text-left h-[140px] flex flex-col transition-all ${sel ? "scale-[1.02]" : ""}`}
                      style={{
                        borderColor: sel ? "#ff3a3a" : "#ffd84a",
                        background: "#fff7d6",
                        opacity: ok ? 1 : 0.45,
                      }}>
                      <div className="text-[8px]" style={{ color: "#0a0e1f" }}>
                        {it.weapon ? "WEAPON" : it.consumable ? "CONSUMABLE" : "GENERAL"}
                      </div>
                      <div className="flex-1 grid place-items-center">
                        <div style={{ width: 36, height: 36, background: it.color, border: "2px solid #0a0e1f" }} />
                      </div>
                      <div className="text-[9px]" style={{ color: "#0a0e1f" }}>{it.name}</div>
                      <div className="text-[8px]" style={{ color: "#a83a00" }}>
                        {it.cost} {it.currency.toUpperCase()}
                      </div>
                    </button>
                  );
                })}
              </div>
              {selected && (() => {
                const it = MAIN_SHOP.find(x => x.id === selected);
                return it ? <div className="mt-2 text-[9px] p-2 border" style={{ borderColor: palette.border, color: palette.text, background: "#0a0e1f" }}>{it.desc}</div> : null;
              })()}
            </>
          )}

          {kind === "shady" && (
            <div className="grid grid-cols-2 gap-3">
              {/* LEFT: weapon-augment cards (existing AUGMENT_SHOP) */}
              <div>
                <div className="text-[10px] mb-2" style={{ color: palette.header }}>RUNES (PASSIVE)</div>
                <div className="grid grid-cols-2 gap-2">
                  {visible.map((a: any) => {
                    const owned = stats.inventory.augments.includes(a.id);
                    const ok = canAfford(a.cost, a.currency) && game.canBuyAugment(a.id);
                    const sel = selected === a.id;
                    return (
                      <button key={a.id}
                        onClick={() => { setSelected(a.id); if (sel && ok) buyAug(a); }}
                        disabled={!ok}
                        className={`border-2 p-2 text-left h-[100px] flex flex-col ${sel ? "ring-2 ring-red-500" : ""}`}
                        style={{ borderColor: a.color, background: "#0a0e1f", opacity: owned ? 0.4 : ok ? 1 : 0.55 }}>
                        <div className="text-[9px]" style={{ color: a.color }}>{a.name}</div>
                        <div className="text-[7px] text-[#fff7d6]/60">{a.tier}</div>
                        <div className="text-[7px] text-[#fff7d6]/80 line-clamp-3 flex-1 mt-1">{a.desc}</div>
                        <div className="text-[8px]" style={{ color: a.color }}>{owned || !game.canBuyAugment(a.id) ? "MAXED" : `${a.cost} ${a.currency.toUpperCase()}`}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* RIGHT: status effects panel */}
              <div>
                <div className="text-[10px] mb-2" style={{ color: palette.header }}>
                  STATUS EFFECTS — applies to active ranged weapon (max 3/item)
                </div>
                <div className="space-y-1.5">
                  {STATUS_AUGMENTS.map(s => {
                    const id = `status:${s.id}`;
                    const ok = stats.crystals >= s.cost && game.canBuyStatusAugment(s.id);
                    const has = game.hasStatusOnActive(s.id);
                    const sel = selected === id;
                    return (
                      <button key={id}
                        onClick={() => { setSelected(id); if (sel && ok && !has) buyStatus(s.id, s.cost); }}
                        disabled={!ok || has}
                        className={`w-full flex items-center justify-between border-2 px-2 py-1.5 text-[10px] ${sel ? "ring-2 ring-red-500" : ""}`}
                        style={{ borderColor: "#d97bff", background: "#0a0e1f", color: "#fff7d6", opacity: has ? 0.5 : ok ? 1 : 0.6 }}>
                        <span>{s.name}</span>
                        <span className="flex-1 text-[8px] text-left ml-2 text-[#fff7d6]/70">{s.desc}</span>
                        <span style={{ color: "#d97bff" }}>{has ? "ADDED" : !game.canBuyStatusAugment(s.id) ? `MAX ${game.activeWeaponStatusCount()}/3` : `ADD · ${s.cost}`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {kind === "ally" && (
            <>
              <div className="text-[9px] mb-2" style={{ color: palette.text }}>SCROLL FOR MORE →   timed allies fight until lifespan ends</div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {ALLIES.map(a => {
                  const ok = canAfford(a.cost, a.currency);
                  const sel = selected === a.id;
                  return (
                    <div key={a.id}
                      className={`min-w-[180px] border-4 p-2 flex flex-col ${sel ? "ring-2 ring-red-500" : ""}`}
                      style={{ borderColor: palette.accent, background: "#fff7d6" }}>
                      <div className="text-[10px]" style={{ color: "#0a0e1f" }}>{a.name}</div>
                      <div className="h-[80px] grid place-items-center my-1" style={{ background: "#0a0e1f" }}>
                        <div style={{
                          width: a.w * 1.4, height: a.h * 1.4,
                          background: a.color, borderBottom: `4px solid ${a.accent}`,
                        }} />
                      </div>
                      <div className="text-[8px]" style={{ color: "#0a0e1f" }}>HP {a.hp} · DMG {a.dmg}</div>
                      <div className="text-[8px]" style={{ color: "#0a0e1f" }}>▸ {a.ability}</div>
                      <button onClick={() => { setSelected(a.id); buyAlly(a); }} disabled={!ok}
                        className="mt-1 text-[9px] py-1"
                        style={{ background: ok ? palette.accent : "#888", color: "#0a0e1f" }}>
                        BUY · {a.cost} {a.currency.toUpperCase()}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {(kind === "main" || kind === "shady") && pages > 1 && (
          <div className="flex items-center justify-center gap-2 py-2 text-[10px]" style={{ background: "#0a0e1f", color: palette.text }}>
            <button onClick={() => setPage(p => Math.max(0, p-1))} className="border px-2 py-1 hover:bg-white/20" style={{ borderColor: palette.text }}>◀</button>
            <div>PAGE {page+1} / {pages}</div>
            <button onClick={() => setPage(p => Math.min(pages-1, p+1))} className="border px-2 py-1 hover:bg-white/20" style={{ borderColor: palette.text }}>▶</button>
          </div>
        )}

        <div className="text-center text-[8px] py-1" style={{ background: "#0a0e1f", color: palette.text }}>
          CLICK A CARD TO SELECT — CLICK AGAIN OR PRESS ENTER TO BUY  •  ESC/T = EXIT
        </div>
      </div>
    </div>
  );
};
