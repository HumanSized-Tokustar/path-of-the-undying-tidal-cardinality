import { WEAPONS } from "@/game/weapons";
import { MAIN_SHOP, ALLIES } from "@/game/shops";
import { STATUS_AUGMENTS } from "@/game/engine";

const enemies = [
  ["Shooter", "100 HP. Gunner with dash and double jump."], ["Shanker", "60 HP. Knife rusher with dash and double jump."],
  ["Brute", "320 HP. Heavy shooter/stomper."], ["Necromancer", "ALRIGHT after 2000m. Black wizard, 200 HP, spawns 30 HP minions."],
  ["THE BRON", "SON after 1700m. Black basketball player, 300 HP, throws orange ball for 50."],
  ["GIANT", "SON after 1700m. Very big gray humanoid, 777 HP, stomp 70."],
  ["APACHE", "SON after 1700m. Helicopter, 500 HP, bullets and rockets, flies."],
];

export const AlmanacOverlay = ({ onClose }: { onClose: () => void }) => (
  <div className="absolute inset-0 z-50 bg-background/95 pixel-text p-4 overflow-auto">
    <div className="mx-auto w-[min(960px,96vw)] border-2 border-primary bg-card/95 p-4">
      <div className="flex items-center justify-between mb-4"><h2 className="text-primary text-[18px]">ALMANAC</h2><button onClick={onClose} className="border border-border px-3 py-1 text-foreground">CLOSE</button></div>
      <Section title="Weapons">
        {Object.values(WEAPONS).map(w => <Card key={w.id} color={w.color} title={`${w.name} — ${w.class.toUpperCase()}`} text={`${w.visual}. ${w.desc} DMG ${w.dmg}, CD ${w.fireCd}s.`} />)}
      </Section>
      <Section title="Shop Purchases">
        {MAIN_SHOP.map(i => <Card key={i.id} color={i.color} title={`${i.name} — ${i.cost} ${i.currency}`} text={`${i.visual}. ${i.desc} Limit: ${i.limit ?? 1}.`} />)}
      </Section>
      <Section title="Enemies">
        {enemies.map(([n,d]) => <Card key={n} color="#ff6a6a" title={n} text={d} />)}
      </Section>
      <Section title="Allies">
        {ALLIES.map(a => <Card key={a.id} color={a.color} title={`${a.name} — ${a.cost} tokens`} text={`${a.desc} Lifespan ${Math.round(a.lifespan)}s. ${a.ability}.`} />)}
      </Section>
      <Section title="Mechanics">
        <Card color="#7be0ff" title="Spawns" text="5 enemies every 5 seconds, SON doubles. Every 666m adds +6 per wave. Caps: DUNCE 7, ALRIGHT 15, SON 40. Every 5th increase shows (THE TIDE RISES)." />
        <Card color="#d97bff" title="Status Effects" text={STATUS_AUGMENTS.map(s => `${s.name}: ${s.desc}`).join(" | ")} />
        <Card color="#7bff8a" title="Safe Zones" text="Shop landmarks block enemy spawning and AI entry within 9 meters of the shop center." />
      </Section>
    </div>
  </div>
);
const Section = ({ title, children }: { title:string; children: React.ReactNode }) => <section className="mb-5"><h3 className="text-accent text-[13px] mb-2">{title}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{children}</div></section>;
const Card = ({ color, title, text }: { color:string; title:string; text:string }) => <div className="border border-border bg-muted/40 p-2 text-left"><div className="flex gap-2"><span style={{background:color}} className="w-5 h-5 border border-border shrink-0"/><div><div className="text-foreground text-[10px]">{title}</div><div className="text-muted-foreground text-[8px] leading-relaxed">{text}</div></div></div></div>;
