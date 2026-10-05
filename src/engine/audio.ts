import { MUSIC, type Track } from '@/data/music';

export type SfxName =
  | 'cursor'
  | 'confirm'
  | 'cancel'
  | 'error'
  | 'hit'
  | 'crit'
  | 'miss'
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

type Wave = OscillatorType;

interface ToneOpts {
  wave?: Wave;
  vol?: number;
  slideTo?: number;
  when?: number;
  attack?: number;
  dest?: AudioNode;
}

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteToFreq(note: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(note);
  if (!m) return 0;
  let semis = NOTE_INDEX[m[1]];
  if (m[2] === '#') semis += 1;
  if (m[2] === 'b') semis -= 1;
  const midi = (parseInt(m[3], 10) + 1) * 12 + semis;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface ParsedChannel {
  wave: Wave;
  vol: number;
  length: number;
  events: { step: number; freq: number; len: number }[];
}

function parseTrack(track: Track): ParsedChannel[] {
  return track.channels.map((ch) => {
    const tokens = ch.notes.trim().split(/\s+/);
    const events: ParsedChannel['events'] = [];
    tokens.forEach((tok, i) => {
      if (tok === '-' || tok === '=') return;
      let len = 1;
      while (tokens[i + len] === '=') len++;
      events.push({ step: i, freq: noteToFreq(tok), len });
    });
    return { wave: ch.wave, vol: ch.vol, length: tokens.length, events };
  });
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  sfxEnabled = true;
  musicEnabled = true;

  private trackId: string | null = null;
  private resumeTrackId: string | null = null;
  private parsed: ParsedChannel[] = [];
  private stepDur = 0.25;
  private loop = true;
  private nextStep = 0;
  private nextTime = 0;
  private totalSteps = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
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
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxEnabled ? 0.55 : 0;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicEnabled ? 0.32 : 0;
      this.musicBus.connect(this.master);

      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      if (this.trackId) this.startSequencer();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setSfxEnabled(on: boolean) {
    this.sfxEnabled = on;
    if (this.sfxBus) this.sfxBus.gain.value = on ? 0.55 : 0;
  }

  setMusicEnabled(on: boolean) {
    this.musicEnabled = on;
    if (this.musicBus) this.musicBus.gain.value = on ? 0.32 : 0;
  }

  private tone(freq: number, dur: number, opts: ToneOpts = {}) {
    const ctx = this.ctx;
    if (!ctx || freq <= 0) return;
    const when = opts.when ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.wave ?? 'square';
    osc.frequency.setValueAtTime(freq, when);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, when + dur);
    const vol = opts.vol ?? 0.3;
    const attack = opts.attack ?? 0.005;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(vol, when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(opts.dest ?? this.sfxBus!);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  private noise(dur: number, vol = 0.3, filter = 2000, when?: number) {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer) return;
    const t = when ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'lowpass';
    bp.frequency.value = filter;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.sfxBus!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  sfx(name: SfxName) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxEnabled) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'cursor':
        this.tone(1320, 0.04, { vol: 0.12 });
        break;
      case 'confirm':
        this.tone(880, 0.05, { vol: 0.15 });
        this.tone(1320, 0.08, { vol: 0.15, when: t + 0.05 });
        break;
      case 'cancel':
        this.tone(660, 0.05, { vol: 0.15 });
        this.tone(440, 0.08, { vol: 0.15, when: t + 0.05 });
        break;
      case 'error':
        this.tone(160, 0.15, { vol: 0.2, wave: 'sawtooth' });
        break;
      case 'blip':
        if (t - this.lastBlip < 0.045) return;
        this.lastBlip = t;
        this.tone(740, 0.025, { vol: 0.05 });
        break;
      case 'hit':
        this.noise(0.12, 0.45, 1800);
        this.tone(180, 0.1, { vol: 0.25, slideTo: 60 });
        break;
      case 'crit':
        this.noise(0.2, 0.55, 3200);
        this.tone(320, 0.18, { vol: 0.3, slideTo: 60, wave: 'sawtooth' });
        break;
      case 'miss':
        this.tone(900, 0.12, { vol: 0.12, slideTo: 1800, wave: 'sine' });
        break;
      case 'magic':
        this.tone(440, 0.35, { vol: 0.15, slideTo: 1760, wave: 'triangle' });
        this.tone(660, 0.35, { vol: 0.08, slideTo: 2640, when: t + 0.04 });
        break;
      case 'fire':
        this.noise(0.45, 0.35, 900);
        this.tone(220, 0.4, { vol: 0.15, slideTo: 80, wave: 'sawtooth' });
        break;
      case 'ice':
        [1760, 2093, 2637, 3136].forEach((f, i) =>
          this.tone(f, 0.12, { vol: 0.08, wave: 'triangle', when: t + i * 0.05 }),
        );
        this.noise(0.3, 0.15, 6000, t + 0.1);
        break;
      case 'heal':
        [523, 659, 784, 1047, 1319].forEach((f, i) =>
          this.tone(f, 0.18, { vol: 0.1, wave: 'triangle', when: t + i * 0.06 }),
        );
        break;
      case 'poison':
        this.tone(300, 0.2, { vol: 0.15, slideTo: 150, wave: 'sine' });
        this.tone(250, 0.2, { vol: 0.12, slideTo: 120, wave: 'sine', when: t + 0.12 });
        break;
      case 'enemyDie':
        this.noise(0.5, 0.3, 1200);
        this.tone(600, 0.45, { vol: 0.15, slideTo: 40, wave: 'sawtooth' });
        break;
      case 'encounter':
        [220, 330, 440, 660, 880].forEach((f, i) =>
          this.tone(f, 0.08, { vol: 0.15, when: t + i * 0.05 }),
        );
        this.noise(0.4, 0.25, 4000, t + 0.25);
        break;
      case 'buy':
        this.tone(1568, 0.06, { vol: 0.15 });
        this.tone(2093, 0.18, { vol: 0.15, when: t + 0.06 });
        break;
      case 'chest':
        [784, 988, 1175, 1568].forEach((f, i) =>
          this.tone(f, 0.12, { vol: 0.12, when: t + i * 0.07 }),
        );
        break;
      case 'run':
        [800, 600, 400, 300].forEach((f, i) => this.tone(f, 0.06, { vol: 0.1, when: t + i * 0.05 }));
        break;
      case 'defend':
        this.tone(520, 0.15, { vol: 0.15, wave: 'triangle', slideTo: 780 });
        break;
      case 'steal':
        this.tone(1200, 0.05, { vol: 0.12 });
        this.tone(1800, 0.08, { vol: 0.12, when: t + 0.05 });
        break;
      case 'save':
        [659, 784, 988, 1319].forEach((f, i) =>
          this.tone(f, 0.15, { vol: 0.12, wave: 'triangle', when: t + i * 0.08 }),
        );
        break;
    }
  }

  get currentTrack() {
    return this.trackId;
  }

  playMusic(id: string | null) {
    if (id === this.trackId) return;
    this.resumeTrackId = null;
    this.switchTo(id);
  }

  /** Play a one-shot track (fanfare, inn jingle) then go back to the previous one. */
  playJingle(id: string, resume = true) {
    const prev = this.resumeTrackId ?? this.trackId;
    this.switchTo(id);
    this.resumeTrackId = resume ? prev : null;
  }

  stopMusic() {
    this.playMusic(null);
  }

  private switchTo(id: string | null) {
    this.stopSequencer();
    this.trackId = id;
    if (!id) return;
    const track = MUSIC[id];
    if (!track) return;
    this.parsed = parseTrack(track);
    this.stepDur = 60 / track.bpm / 2;
    this.loop = track.loop;
    this.totalSteps = Math.max(...this.parsed.map((c) => c.length));
    if (this.ctx) this.startSequencer();
  }

  private startSequencer() {
    if (!this.ctx) return;
    this.stopSequencer();
    this.nextStep = 0;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  private stopSequencer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    while (this.nextTime < ctx.currentTime + 0.15) {
      if (!this.loop && this.nextStep >= this.totalSteps) {
        this.stopSequencer();
        const resume = this.resumeTrackId;
        this.trackId = null;
        this.resumeTrackId = null;
        if (resume) this.switchTo(resume);
        return;
      }
      for (const ch of this.parsed) {
        const local = this.loop ? this.nextStep % ch.length : this.nextStep;
        for (const ev of ch.events) {
          if (ev.step === local) {
            this.tone(ev.freq, ev.len * this.stepDur * 0.92, {
              wave: ch.wave,
              vol: ch.vol,
              when: this.nextTime,
              attack: 0.01,
              dest: this.musicBus,
            });
          }
        }
      }
      this.nextStep++;
      this.nextTime += this.stepDur;
    }
  }
}

export const Sound = new AudioEngine();
