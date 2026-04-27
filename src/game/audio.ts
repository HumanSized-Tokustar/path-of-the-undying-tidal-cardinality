import musicJetpack from "@/assets/audio/music_jetpack.mp3";
import musicGarfield from "@/assets/audio/music_garfield.mp3";
import musicMinecraft from "@/assets/audio/music_minecraft.mp3";
import musicLego from "@/assets/audio/music_lego.mp3";
import sfxFire from "@/assets/audio/sfx_fire.mp3";
import sfxKill from "@/assets/audio/sfx_kill.mp3";
import sfxDeath from "@/assets/audio/sfx_death.mp3";
import sfxPurchase from "@/assets/audio/sfx_purchase.mp3";
import sfxBoss from "@/assets/audio/sfx_boss.mp3";

export const MUSIC_TRACKS = [musicJetpack, musicGarfield, musicMinecraft, musicLego];
export const MUSIC_NAMES = ["Jetpack Joyride", "Garfield", "Minecraft", "Lego Saloon"];

type SfxKey = "fire" | "kill" | "death" | "purchase" | "boss";
const SFX_SRC: Record<SfxKey, string> = {
  fire: sfxFire, kill: sfxKill, death: sfxDeath, purchase: sfxPurchase, boss: sfxBoss,
};

class AudioManager {
  private musicEl: HTMLAudioElement | null = null;
  private trackIndex = 0;
  private musicVol = 0.18;
  private sfxVol = 0.55;
  private sfxPools: Record<SfxKey, HTMLAudioElement[]> = { fire: [], kill: [], death: [], purchase: [], boss: [] };
  private muted = false;
  private started = false;

  init() {
    if (this.started) return;
    this.started = true;
    (Object.keys(SFX_SRC) as SfxKey[]).forEach((k) => {
      this.sfxPools[k] = Array.from({ length: 4 }, () => {
        const a = new Audio(SFX_SRC[k]);
        a.volume = this.sfxVol;
        return a;
      });
    });
  }

  setMusicVolume(v: number) { this.musicVol = v; if (this.musicEl) this.musicEl.volume = v; }
  setSfxVolume(v: number) {
    this.sfxVol = v;
    Object.values(this.sfxPools).flat().forEach(a => (a.volume = v));
  }
  getMusicVolume() { return this.musicVol; }
  getSfxVolume() { return this.sfxVol; }

  startMusic() {
    this.init();
    this.playTrack(this.trackIndex);
  }
  stopMusic() {
    if (this.musicEl) { this.musicEl.pause(); this.musicEl = null; }
  }
  private playTrack(i: number) {
    this.stopMusic();
    const a = new Audio(MUSIC_TRACKS[i]);
    a.volume = this.musicVol;
    a.addEventListener("ended", () => {
      this.trackIndex = (this.trackIndex + 1) % MUSIC_TRACKS.length;
      this.playTrack(this.trackIndex);
    });
    a.play().catch(() => {});
    this.musicEl = a;
  }
  currentTrackName() { return MUSIC_NAMES[this.trackIndex]; }

  play(key: SfxKey) {
    if (this.muted) return;
    this.init();
    const pool = this.sfxPools[key];
    if (!pool || pool.length === 0) return;
    const a = pool.find(x => x.paused || x.ended) ?? pool[0];
    try { a.currentTime = 0; a.volume = this.sfxVol; a.play().catch(() => {}); } catch {}
  }
}

export const audio = new AudioManager();
