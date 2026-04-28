import { useState } from "react";
import { audio } from "@/game/audio";
import {
  ALL_ACTIONS, ACTION_LABEL, GameAction,
  getKeybinds, setKeybinds, resetKeybinds, prettyKey, normalizeKey, DEFAULT_KEYBINDS,
} from "@/game/keybinds";

export const SettingsOverlay = ({ onClose }: { onClose: () => void }) => {
  const [tab, setTab] = useState<"audio" | "controls">("audio");
  const [musicVol, setMusicVol] = useState(audio.getMusicVolume());
  const [sfxVol, setSfxVol] = useState(audio.getSfxVolume());
  const [kb, setKb] = useState<Record<GameAction, string>>({ ...getKeybinds() });
  const [awaiting, setAwaiting] = useState<GameAction | null>(null);
  const [error, setError] = useState<string>("");

  const startCapture = (a: GameAction) => {
    setAwaiting(a);
    setError("");
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const key = normalizeKey(e.key);
      if (key === "escape" && a !== "pause") {
        setAwaiting(null);
        window.removeEventListener("keydown", handler, true);
        return;
      }
      // Prevent duplicate bindings
      const existing = (Object.keys(kb) as GameAction[]).find(k => k !== a && kb[k] === key);
      if (existing) {
        setError(`"${prettyKey(key)}" is already bound to ${ACTION_LABEL[existing]}`);
      } else {
        const next = { ...kb, [a]: key };
        setKb(next);
        setKeybinds(next);
      }
      setAwaiting(null);
      window.removeEventListener("keydown", handler, true);
    };
    window.addEventListener("keydown", handler, true);
  };

  const resetAll = () => {
    const def = resetKeybinds();
    setKb({ ...def });
    setError("");
  };

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/70 p-4 pixel-text">
      <div className="w-[min(92vw,720px)] max-h-[90vh] border-2 border-[#ffd84a] bg-[#0a0e1f]/95 flex flex-col">
        <div className="flex items-center border-b-2 border-[#3a4a72]">
          <TabBtn active={tab === "audio"} onClick={() => setTab("audio")}>AUDIO</TabBtn>
          <TabBtn active={tab === "controls"} onClick={() => setTab("controls")}>CONTROLS</TabBtn>
          <div className="flex-1" />
          <button onClick={onClose} className="px-3 py-2 text-[11px] text-[#fff7d6] hover:text-[#ffd84a]">✕ CLOSE</button>
        </div>

        <div className="overflow-y-auto p-5 flex-1">
          {tab === "audio" && (
            <div className="space-y-5">
              <Slider label={`MUSIC  ${Math.round(musicVol * 100)}%`} value={musicVol} onChange={(v) => { setMusicVol(v); audio.setMusicVolume(v); }} />
              <Slider label={`SFX    ${Math.round(sfxVol * 100)}%`} value={sfxVol} onChange={(v) => { setSfxVol(v); audio.setSfxVolume(v); }} />
            </div>
          )}

          {tab === "controls" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] text-[#fff7d6]/80">
                  Click a row, then press a key to rebind. Press ESC to cancel.
                </div>
                <button onClick={resetAll} className="px-2 py-1 border border-[#ffd84a] text-[10px] text-[#ffd84a] hover:bg-[#ffd84a] hover:text-[#0a0e1f]">
                  RESET DEFAULTS
                </button>
              </div>
              {error && <div className="text-[10px] text-[#ff6a6a] mb-2">{error}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ALL_ACTIONS.map((a) => {
                  const isDefault = kb[a] === DEFAULT_KEYBINDS[a];
                  return (
                    <button
                      key={a}
                      onClick={() => startCapture(a)}
                      className={`flex items-center justify-between px-2.5 py-1.5 border-2 text-[10px] transition-colors ${
                        awaiting === a
                          ? "border-[#ffd84a] bg-[#ffd84a]/20 text-[#ffd84a] animate-pulse"
                          : "border-[#3a4a72] bg-[#0a0e1f] text-[#fff7d6] hover:border-[#ffd84a]/60"
                      }`}
                    >
                      <span>{ACTION_LABEL[a]}</span>
                      <span className={isDefault ? "text-[#7be0ff]" : "text-[#ffd84a]"}>
                        {awaiting === a ? "PRESS KEY..." : `[${prettyKey(kb[a])}]`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-[11px] border-r-2 border-[#3a4a72] ${active ? "bg-[#ffd84a]/20 text-[#ffd84a]" : "text-[#fff7d6]/70 hover:text-[#fff7d6]"}`}
  >
    {children}
  </button>
);

const Slider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <label className="block">
    <div className="text-[10px] mb-2 text-[#fff7d6]/80">{label}</div>
    <input
      type="range" min={0} max={1} step={0.01} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-[#ffd84a]"
    />
  </label>
);
