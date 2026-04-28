import { useState } from "react";
import { audio } from "@/game/audio";
import { SettingsOverlay } from "@/components/game/SettingsOverlay";

type Difficulty = "dunce" | "alright" | "son";

export const StartScreen = ({ onStart, onDifficulty }: { onStart: () => void; onDifficulty?: (d: Difficulty) => void }) => {
  const [view, setView] = useState<"main" | "settings" | "credits">("main");
  const [musicVol, setMusicVol] = useState(audio.getMusicVolume());
  const [sfxVol, setSfxVol] = useState(audio.getSfxVolume());
  const [diff, setDiff] = useState<Difficulty>("alright");
  const setD = (d: Difficulty) => { setDiff(d); onDifficulty?.(d); };
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="absolute inset-0 grid place-items-center bg-background/85 pixel-text">
      <div className="w-[min(560px,92vw)] p-6 border-2 border-primary bg-card/90 glow-amber text-center">
        {view === "main" && (
          <>
            <div className="text-[10px] text-foreground/60 mb-2">Endless Pixel Platform Shooter</div>
            <div className="relative mb-6">
              {/* Infinity symbol behind title */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="-110 -50 220 100"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="infGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
                    <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.55" />
                  </linearGradient>
                </defs>
                <path
                  d="M -90,0 C -90,-50 -30,-50 0,0 C 30,50 90,50 90,0 C 90,-50 30,-50 0,0 C -30,50 -90,50 -90,0 Z"
                  fill="none"
                  stroke="url(#infGrad)"
                  strokeWidth="3"
                  className="opacity-80 animate-pulse"
                />
                <path
                  d="M -90,0 C -90,-50 -30,-50 0,0 C 30,50 90,50 90,0 C 90,-50 30,-50 0,0 C -30,50 -90,50 -90,0 Z"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1"
                  strokeOpacity="0.35"
                />
              </svg>
              <div className="relative z-10">
                <h1 className="text-[hsl(var(--primary))] text-[18px] leading-snug mb-1" style={{ textShadow: "2px 2px 0 #0a0e1f" }}>PATH OF THE</h1>
                <h1 className="text-[hsl(var(--accent))] text-[20px] leading-snug mb-1" style={{ textShadow: "2px 2px 0 #0a0e1f" }}>UNDYING TIDAL</h1>
                <h1 className="text-[hsl(var(--secondary))] text-[18px] leading-snug" style={{ textShadow: "2px 2px 0 #0a0e1f" }}>CARDINALITY</h1>
              </div>
            </div>
            <div className="space-y-2.5">
              <Btn onClick={onStart} primary>▶ START GAME</Btn>
              <Btn onClick={() => setShowSettings(true)}>⚙ SETTINGS / KEYBINDS</Btn>
              <Btn onClick={() => setView("credits")}>★ CREDITS</Btn>
            </div>
            <div className="mt-4">
              <div className="text-[9px] text-foreground/70 mb-1">LEVEL OF ENEMY THREAT</div>
              <div className="flex gap-1 justify-center">
                {(["dunce","alright","son"] as Difficulty[]).map(d => (
                  <button key={d} onClick={() => setD(d)}
                    className={`px-2 py-1 border-2 text-[9px] ${diff === d ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]" : "border-border text-foreground/70"}`}>
                    {d === "dunce" ? "DUNCE" : d === "alright" ? "ALRIGHT" : "SON 😭"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 text-[8px] text-foreground/50 leading-relaxed">
              WASD MOVE · SPACE/W JUMP×2 · Q DASH · Z ROLL · F FIRE<br />
              O/P MISC (HOLD) · R MELEE · E PARRY · V GRAB (HOLD) · X SHIELD · G OVERDRIVE · TAB INV · ESC PAUSE
            </div>
          </>
        )}

        {view === "settings" && (
          <>
            <h2 className="text-[hsl(var(--primary))] text-[14px] mb-6">SETTINGS</h2>
            <div className="space-y-5 text-left">
              <Slider label={`MUSIC  ${Math.round(musicVol * 100)}%`} value={musicVol} onChange={(v) => { setMusicVol(v); audio.setMusicVolume(v); }} />
              <Slider label={`SFX    ${Math.round(sfxVol * 100)}%`} value={sfxVol} onChange={(v) => { setSfxVol(v); audio.setSfxVolume(v); }} />
            </div>
            <div className="mt-6"><Btn onClick={() => setView("main")}>◀ BACK</Btn></div>
          </>
        )}

        {view === "credits" && (
          <>
            <h2 className="text-[hsl(var(--primary))] text-[14px] mb-6">CREATED BY</h2>
            <div className="space-y-2 text-[12px] text-[hsl(var(--accent))]">
              <div>★ HISHAM</div>
              <div>★ ADAM</div>
              <div>★ RHIAN</div>
            </div>
            <div className="mt-6 text-[10px] text-foreground/70">THANKS FOR PLAYING OUR GAME :)</div>
            <div className="mt-6"><Btn onClick={() => setView("main")}>◀ BACK</Btn></div>
          </>
        )}
      </div>
      {showSettings && <SettingsOverlay onClose={() => setShowSettings(false)} />}
    </div>
  );
};

const Btn = ({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) => (
  <button
    onClick={onClick}
    className={`w-full py-2.5 px-3 border-2 transition-colors text-[11px] ${
      primary
        ? "border-primary bg-primary/20 text-[hsl(var(--primary))] hover:bg-primary/40"
        : "border-border bg-muted/40 text-foreground hover:bg-muted/70"
    }`}
  >
    {children}
  </button>
);

const Slider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <label className="block">
    <div className="text-[10px] mb-2 text-foreground/80">{label}</div>
    <input
      type="range" min={0} max={1} step={0.01} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-[hsl(var(--primary))]"
    />
  </label>
);
