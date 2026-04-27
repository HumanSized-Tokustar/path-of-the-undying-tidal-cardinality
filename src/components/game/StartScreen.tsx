import { useState } from "react";
import { audio } from "@/game/audio";

export const StartScreen = ({ onStart }: { onStart: () => void }) => {
  const [view, setView] = useState<"main" | "settings" | "credits">("main");
  const [musicVol, setMusicVol] = useState(audio.getMusicVolume());
  const [sfxVol, setSfxVol] = useState(audio.getSfxVolume());

  return (
    <div className="absolute inset-0 grid place-items-center bg-background/85 pixel-text">
      <div className="w-[min(560px,92vw)] p-6 border-2 border-primary bg-card/90 glow-amber text-center">
        {view === "main" && (
          <>
            <div className="text-[10px] text-foreground/60 mb-2">Endless Pixel Platform Shooter</div>
            <h1 className="text-[hsl(var(--primary))] text-[18px] leading-snug mb-1">PATH OF THE</h1>
            <h1 className="text-[hsl(var(--accent))] text-[20px] leading-snug mb-1">UNDYING TIDAL</h1>
            <h1 className="text-[hsl(var(--secondary))] text-[18px] leading-snug mb-6">CARDINALITY</h1>
            <div className="space-y-2.5">
              <Btn onClick={onStart} primary>▶ START GAME</Btn>
              <Btn onClick={() => setView("settings")}>⚙ SETTINGS</Btn>
              <Btn onClick={() => setView("credits")}>★ CREDITS</Btn>
            </div>
            <div className="mt-6 text-[8px] text-foreground/50 leading-relaxed">
              WASD MOVE · SPACE JUMP×2 · SHIFT DASH · J FIRE<br />K MISC · L MELEE · I SHIELD · F OVERDRIVE · Y INVENTORY
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
