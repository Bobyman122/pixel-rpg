import { ASSET_BASE } from './assets';

export type SfxName =
  | 'cursor'
  | 'confirm'
  | 'cancel'
  | 'error'
  | 'hit'
  | 'crit'
  | 'miss'
  | 'slash'
  | 'magic'
  | 'fire'
  | 'ice'
  | 'heal'
  | 'poison'
  | 'enemyDie'
  | 'encounter'
  | 'buy'
  | 'chest'
  | 'blip'
  | 'run'
  | 'defend'
  | 'steal'
  | 'save';

const SFX_FILES: Exclude<SfxName, 'blip'>[] = [
  'cursor', 'confirm', 'cancel', 'error', 'hit', 'crit', 'miss', 'slash', 'magic', 'fire', 'ice', 'heal',
  'poison', 'enemyDie', 'encounter', 'buy', 'chest', 'run', 'defend', 'steal', 'save',
];

/** Per-sound loudness tweaks so nothing jumps out of the mix. */
const SFX_GAIN: Partial<Record<SfxName, number>> = {
  cursor: 0.55,
  encounter: 0.8,
  enemyDie: 0.75,
};

export type JingleName = 'victory' | 'fanfare' | 'rest' | 'gameover' | 'levelup';
const JINGLES: JingleName[] = ['victory', 'fanfare', 'rest', 'gameover', 'levelup'];

export const MUSIC_TRACKS = ['title', 'village', 'forest', 'cave', 'battle', 'boss', 'ending'] as const;
export type MusicName = (typeof MUSIC_TRACKS)[number];

const SFX_VOLUME = 0.7;
const MUSIC_VOLUME = 0.42;

interface Loop {
  buffer: AudioBuffer;
  start: number;
  end: number;
}

/**
 * Music and sound effects, played from the asset pack's files through Web Audio.
 * Sound effects are small and decoded up front; music is fetched the first time it's asked for.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<AudioBuffer | null>>();
  private loops = new Map<string, Loop>();

  sfxEnabled = true;
  musicEnabled = true;

  /** The track the game wants playing (it may still be downloading). */
  private trackId: string | null = null;
  /** Track to go back to once a jingle finishes. */
  private resumeTrackId: string | null = null;
  private playing: { id: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private lastBlip = 0;

  /** Must be called from a user gesture; browsers block audio until then. */
  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      const master = this.ctx.createGain();
      master.gain.value = 0.9;
      master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxEnabled ? SFX_VOLUME : 0;
      this.sfxBus.connect(master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicEnabled ? MUSIC_VOLUME : 0;
      this.musicBus.connect(master);

      for (const s of SFX_FILES) void this.load(`sfx/${s}.wav`);
      for (const j of JINGLES) void this.load(`sfx/jingle-${j}.wav`);
      if (this.trackId) this.startTrack(this.trackId);
      // Warm the cache with the rest of the soundtrack, one file at a time.
      void MUSIC_TRACKS.reduce<Promise<unknown>>((p, t) => p.then(() => this.load(`music/${t}.mp3`)), Promise.resolve());
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setSfxEnabled(on: boolean) {
    this.sfxEnabled = on;
    if (this.sfxBus) this.sfxBus.gain.value = on ? SFX_VOLUME : 0;
  }

  setMusicEnabled(on: boolean) {
    this.musicEnabled = on;
    if (this.musicBus) this.musicBus.gain.value = on ? MUSIC_VOLUME : 0;
  }

  private load(path: string): Promise<AudioBuffer | null> {
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(null);
    const ready = this.buffers.get(path);
    if (ready) return Promise.resolve(ready);
    let p = this.pending.get(path);
    if (!p) {
      p = fetch(ASSET_BASE + path)
        .then((r) => {
          if (!r.ok) throw new Error(`${path}: ${r.status}`);
          return r.arrayBuffer();
        })
        .then((data) => ctx.decodeAudioData(data))
        .then((buf) => {
          this.buffers.set(path, buf);
          return buf;
        })
        .catch(() => {
          // A missing sound shouldn't stop the game; let a later call try again.
          this.pending.delete(path);
          return null;
        });
      this.pending.set(path, p);
    }
    return p;
  }

  private playBuffer(buf: AudioBuffer, bus: GainNode, volume = 1) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(bus);
    src.start();
    return src;
  }

  sfx(name: SfxName) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxEnabled || !this.sfxBus) return;
    if (name === 'blip') {
      this.blip();
      return;
    }
    const buf = this.buffers.get(`sfx/${name}.wav`);
    if (buf) this.playBuffer(buf, this.sfxBus, SFX_GAIN[name] ?? 1);
  }

  /** Soft tick for text printing. Synthesised, since it fires many times a second. */
  private blip() {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    if (t - this.lastBlip < 0.05) return;
    this.lastBlip = t;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 520;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    osc.connect(gain);
    gain.connect(this.sfxBus!);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  get currentTrack() {
    return this.trackId;
  }

  playMusic(id: string | null) {
    if (id === this.trackId) return;
    this.resumeTrackId = null;
    this.trackId = id;
    this.startTrack(id);
  }

  /** Play a short jingle on the music channel, then go back to the previous track. */
  playJingle(id: JingleName, resume = true) {
    const prev = this.resumeTrackId ?? this.trackId;
    this.trackId = `jingle:${id}`;
    this.resumeTrackId = resume ? prev : null;
    this.fadeOutCurrent(0.15);
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const jingleId = this.trackId;
    void this.load(`sfx/jingle-${id}.wav`).then((buf) => {
      if (!buf || this.trackId !== jingleId) return;
      const src = this.playBuffer(buf, this.musicBus!, 1.6);
      src.onended = () => {
        if (this.trackId !== jingleId) return;
        const next = this.resumeTrackId;
        this.resumeTrackId = null;
        this.trackId = next;
        if (next) this.startTrack(next);
      };
    });
  }

  stopMusic() {
    this.playMusic(null);
  }

  private fadeOutCurrent(time: number) {
    const cur = this.playing;
    if (!cur || !this.ctx) return;
    const t = this.ctx.currentTime;
    cur.gain.gain.cancelScheduledValues(t);
    cur.gain.gain.setValueAtTime(cur.gain.gain.value, t);
    cur.gain.gain.linearRampToValueAtTime(0, t + time);
    cur.src.stop(t + time + 0.05);
    this.playing = null;
  }

  private startTrack(id: string | null) {
    this.fadeOutCurrent(0.35);
    if (!id || !this.ctx) return;
    const path = `music/${id}.mp3`;
    void this.load(path).then((buf) => {
      // The player may have moved on while this was downloading.
      if (!buf || this.trackId !== id || !this.ctx || !this.musicBus) return;
      if (this.playing?.id === id) return;
      const loop = this.loopPoints(path, buf);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopStart = loop.start;
      src.loopEnd = loop.end;
      const gain = this.ctx.createGain();
      src.connect(gain);
      gain.connect(this.musicBus);
      src.start(this.ctx.currentTime + 0.02, loop.start);
      this.playing = { id, src, gain };
    });
  }

  /** MP3 files carry a few milliseconds of encoder silence at each end; loop around it. */
  private loopPoints(path: string, buf: AudioBuffer): Loop {
    const cached = this.loops.get(path);
    if (cached) return cached;
    const data = buf.getChannelData(0);
    const quiet = 0.0008;
    let a = 0;
    while (a < data.length / 4 && Math.abs(data[a]) < quiet) a++;
    let b = data.length - 1;
    while (b > (data.length * 3) / 4 && Math.abs(data[b]) < quiet) b--;
    const loop = { buffer: buf, start: a / buf.sampleRate, end: (b + 1) / buf.sampleRate };
    this.loops.set(path, loop);
    return loop;
  }
}

export const Sound = new AudioEngine();
