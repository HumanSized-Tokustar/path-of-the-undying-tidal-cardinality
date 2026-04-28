import { useState } from "react";
import { Game } from "@/game/engine";
import { SettingsOverlay } from "@/components/game/SettingsOverlay";

export const PauseOverlay = ({ game }: { game: Game }) => {
  const [showSettings, setShowSettings] = useState(false);
  return (
    <div className="absolute inset-0 flex items-center justify-center pixel-text p-4">
      <div className="bg-[#0a0e1f]/95 border-2 border-[#ffd84a] p-5 text-center w-[min(92vw,560px)] max-h-[90vh] flex flex-col">
        <h2 className="text-[#ffd84a] text-[clamp(16px,3vw,28px)] mb-3" style={{ textShadow: "3px 3px 0 #1a2342" }}>PAUSED</h2>
        <div className="text-[#fff7d6] text-[clamp(8px,1.2vw,11px)] space-y-1 mb-4 text-left overflow-y-auto flex-1 min-h-0 pr-1">
          <div>WASD — Move  •  W on ladder — Climb up  •  S on ladder — Climb down</div>
          <div>SPACE or W — Jump (×2)  •  S+SPACE — Drop through</div>
          <div>Q — Dash (2 charges, 2s recharge)</div>
          <div>Z — Roll (2 charges, 4s recharge — spin, 2× dash length, knocks enemies back)</div>
          <div>S in air — Ground Slam</div>
          <div>F — Fire ranged  •  R — Melee</div>
          <div>O — Misc A  •  P — Misc B (hold to charge throw)</div>
          <div>1-6 — Switch ranged  •  Wheel — Cycle</div>
          <div>E — Parry  •  V — Grab (hold to charge throw further)</div>
          <div>X — Shield  •  G — Overdrive</div>
          <div>TAB — Inventory  •  ESC — Pause</div>
          <div className="pt-1 text-[#7be0ff]">All keys rebindable in SETTINGS below.</div>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <button onClick={() => game.resume()}
            className="border-2 border-[#ffd84a] text-[#ffd84a] py-2 px-4 text-[11px] hover:bg-[#ffd84a] hover:text-[#0a0e1f] transition-colors">
            RESUME (ESC)
          </button>
          <button onClick={() => setShowSettings(true)}
            className="border-2 border-[#7be0ff] text-[#7be0ff] py-2 px-4 text-[10px] hover:bg-[#7be0ff] hover:text-[#0a0e1f] transition-colors">
            ⚙ SETTINGS / KEYBINDS
          </button>
          <button onClick={() => game.goToMenu()}
            className="border-2 border-[#fff7d6]/60 text-[#fff7d6] py-2 px-4 text-[10px] hover:bg-[#fff7d6]/20 transition-colors">
            MAIN MENU
          </button>
        </div>
      </div>
      {showSettings && <SettingsOverlay onClose={() => setShowSettings(false)} />}
    </div>
  );
};
