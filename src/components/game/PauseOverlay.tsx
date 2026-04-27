import { Game } from "@/game/engine";

export const PauseOverlay = ({ game }: { game: Game }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pixel-text">
      <div className="bg-[#0a0e1f]/95 border-2 border-[#ffd84a] p-8 text-center max-w-md">
        <h2 className="text-[#ffd84a] text-[28px] mb-6" style={{ textShadow: "3px 3px 0 #1a2342" }}>PAUSED</h2>
        <div className="text-[#fff7d6] text-[10px] space-y-1 mb-6 text-left">
          <div>WASD — Move  •  W on ladder — Climb</div>
          <div>SPACE — Jump (×2)  •  S+SPACE — Drop through</div>
          <div>SHIFT — Dash  •  S+SHIFT — Roll (spin, 2× length, knocks back)</div>
          <div>S in air — Ground Slam</div>
          <div>F — Fire ranged  •  R — Melee</div>
          <div>Q — Misc A  •  E — Misc B (hold to charge throw)</div>
          <div>1-6 — Switch ranged  •  Wheel — Cycle</div>
          <div>C — Parry  •  V — Grab (hold to charge throw further)</div>
          <div>X — Shield  •  G — Overdrive</div>
          <div>TAB — Inventory  •  P — Pause</div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => game.resume()}
            className="border-2 border-[#ffd84a] text-[#ffd84a] py-2 px-4 text-[11px] hover:bg-[#ffd84a] hover:text-[#0a0e1f] transition-colors">
            RESUME (P)
          </button>
          <button onClick={() => game.goToMenu()}
            className="border-2 border-[#fff7d6]/60 text-[#fff7d6] py-2 px-4 text-[10px] hover:bg-[#fff7d6]/20 transition-colors">
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
};
