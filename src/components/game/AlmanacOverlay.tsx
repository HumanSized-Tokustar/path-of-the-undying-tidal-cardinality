import { WEAPONS } from "@/game/weapons";
import { MAIN_SHOP, ALLIES, AUGMENT_SHOP } from "@/game/shops";
import { STATUS_AUGMENTS } from "@/game/engine";

const enemies: { name: string; color: string; desc: string }[] = [
  { name: "Shooter", color: "#ff6a6a", desc: "100 HP. Strafing gunner. Double-jump and short dash. 8 DMG bullets." },
  { name: "Shooter Elite", color: "#ff8c42", desc: "200 HP. 3-round burst (10 DMG). After 400m." },
  { name: "Shanker", color: "#ef4444", desc: "60 HP. Knife rusher. 8 DMG melee. Short jumps when above." },
  { name: "Shanker Swift", color: "#fb7185", desc: "45 HP. Faster shanker. After 400m." },
  { name: "Brute", color: "#9b3a1f", desc: "320 HP. Heavy 3-spread shooter (12 DMG). Stomp leap when close." },
  { name: "Brute Heavy", color: "#5c2018", desc: "600 HP. Slow tank, 5-round shotgun blast (16 DMG each). After 1000m." },
  { name: "Rider", color: "#ffa07a", desc: "140 HP. Flying drop-bombs (14 DMG). Strafes leftward fast. After 700m." },
  { name: "Bomber", color: "#ffb347", desc: "90 HP. Slow flier dropping AoE bombs (22 DMG). After 1000m." },
  { name: "Sniper", color: "#9ed6ff", desc: "130 HP. Charges 1.2s then fires 35 DMG hitscan-fast bullet. After 1000m." },
  { name: "Necromancer", color: "#a78bfa", desc: "ALRIGHT after 2000m. 200 HP. Summons 30 HP Minions every 5s." },
  { name: "Minion", color: "#8b8f98", desc: "30 HP. Summoned by Necromancer. Sprints toward you." },
  { name: "THE BRON", color: "#f97316", desc: "SON after 1700m. 300 HP. Throws 50 DMG basketballs." },
  { name: "GIANT", color: "#6b7280", desc: "SON after 1700m. 777 HP. 70 DMG melee stomp. Screen shake." },
  { name: "APACHE", color: "#3a3a3a", desc: "SON after 1700m. 500 HP helicopter. Mixes 12 and 35 DMG bullets at 0.75s CD." },
];

const mechanics: { title: string; color: string; text: string }[] = [
  { title: "Movement", color: "#7be0ff", text: "Run, double-jump, dash (cyan trail, 0.22s), roll (1.18× speed). Ladders auto-detected. Parry with E during enemy fire to deflect bullets." },
  { title: "Combat Pace", color: "#ffd84a", text: "Player base 9.2 m/s, max 26 m/s. Pace ramps with distance every 900m. Enemies catch up with paceCatchup; SON cap 1.85×, ALRIGHT 1.6×, DUNCE 1.4×." },
  { title: "Spawn System", color: "#ff8c42", text: "Tide tiers every 666m. DUNCE: base 4 +3/tier, cap 8. ALRIGHT: 6 +5, cap 18. SON: 10 +8, cap 36. Every 5th tier shows (THE TIDE RISES). Spawns lead the player at high speed." },
  { title: "Shops", color: "#a78bfa", text: "Main shop every 1234m (purple) with an Upgrade shop adjacent (indigo, crystals/runes + status effects). Ally shop every 1667m (green). 9m safe-zone freezes enemies near each shop." },
  { title: "Currencies", color: "#ffea84", text: "Coins from kills (heavy enemies drop 120-480, normal 50-100). Tokens from coin-conversion at shops. Crystals drop rarely from elites." },
  { title: "Status Effects", color: "#d97bff", text: STATUS_AUGMENTS.map(s => `${s.name}: ${s.desc}`).join(" | ") + ". Burn DoT +15%. Slow ×0.4. Enfeeble damage ×0.18." },
  { title: "Safe Zones", color: "#7bff8a", text: "Within 9 meters of any shop center, enemies cannot enter or fire. Perfect for re-stocking and planning." },
  { title: "Allies", color: "#7bff8a", text: "Bought from Ally Shop. Lifespan-limited. Wave 12: ally pace tracks player pace fully — they always keep up. Tight 280px leash with auto-teleport." },
  { title: "Melee Class (Wave 12)", color: "#ff6a6a", text: "Massively buffed: Knife ×25, Katana ×30, Yamato ×40 (suspends enemies), Gauntlet ×35 (knockback). Near-instakill on most enemies." },
];

function Sprite({ color }: { color: string }) {
  return (
    <div className="shrink-0 relative" style={{ width: 20, height: 20 }}>
      <div className="absolute inset-0 border border-border" style={{ background: color }} />
      <div className="absolute" style={{ top: 3, left: 3, width: 4, height: 4, background: "rgba(255,255,255,0.7)" }} />
      <div className="absolute" style={{ bottom: 2, right: 2, width: 5, height: 2, background: "rgba(0,0,0,0.35)" }} />
    </div>
  );
}

function Card({ color, title, text }: { color: string; title: string; text: string }) {
  return (
    <div className="border border-border bg-muted/40 p-2 text-left">
      <div className="flex gap-2">
        <Sprite color={color} />
        <div>
          <div className="text-foreground text-[10px]">{title}</div>
          <div className="text-muted-foreground text-[8px] leading-relaxed">{text}</div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="text-accent text-[13px] mb-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{children}</div>
    </section>
  );
}

export function AlmanacOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-50 bg-background/95 pixel-text p-4 overflow-auto">
      <div className="mx-auto w-[min(960px,96vw)] border-2 border-primary bg-card/95 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-primary text-[18px]">ALMANAC</h2>
          <button onClick={onClose} className="border border-border px-3 py-1 text-foreground">CLOSE</button>
        </div>

        <Section title="Weapons">
          {Object.values(WEAPONS).map(w => (
            <Card key={w.id} color={w.color} title={`${w.name} — ${w.class.toUpperCase()}`} text={`${w.visual}. ${w.desc} DMG ${w.dmg}, CD ${w.fireCd}s${w.pierce ? `, pierce ${w.pierce}` : ''}.`} />
          ))}
        </Section>

        <Section title="Enemies">
          {enemies.map(e => <Card key={e.name} color={e.color} title={e.name} text={e.desc} />)}
        </Section>

        <Section title="Allies">
          {ALLIES.map(a => <Card key={a.id} color={a.accent} title={`${a.name} — ${a.cost} ${a.currency}`} text={`${a.desc} HP ${a.hp}, DMG ${a.dmg}, life ${a.lifespan}s. ${a.ability}`} />)}
        </Section>

        <Section title="Augments / Status">
          {STATUS_AUGMENTS.map(s => <Card key={s.id} color="#d97bff" title={`${s.name} — ${s.cost}`} text={s.desc} />)}
        </Section>

        <Section title="Mechanics">
          {mechanics.map(m => <Card key={m.title} color={m.color} title={m.title} text={m.text} />)}
        </Section>
      </div>
    </div>
  );
}
