/**
 * Ойын дыбыстары — файлсыз, Web Audio арқылы синтезделеді (прототиптегі Snd).
 * Браузер дыбысты тек пайдаланушы бірдеңе басқаннан кейін қосуға рұқсат береді, сондықтан init()
 * пернені / тышқанды / батырманы басқанда шақырылады.
 */
export type Sound = ReturnType<typeof createSound>;

type PourNodes = { s: AudioBufferSourceNode; f: BiquadFilterNode; g: GainNode };

export function createSound() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let pour: PourNodes | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const snd = {
    on: true,
    init() {
      if (ctx) {
        if (ctx.state === "suspended") void ctx.resume();
        return;
      }
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new AC();
      } catch {
        return;
      }
      master = ctx.createGain();
      master.gain.value = 0.75;
      master.connect(ctx.destination);
      const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noise = b;
    },
    ok(): boolean {
      return !!(ctx && snd.on && ctx.state === "running");
    },
    env(g: GainNode, t: number, a: number, peak: number, dec: number) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
    },
    tone(f: number, dur: number, type: OscillatorType = "sine", peak = 0.05, f2?: number | null, delay = 0) {
      if (!snd.ok() || !ctx || !master) return;
      const t = ctx.currentTime + delay;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      snd.env(g, t, 0.004, peak, dur);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + dur + 0.05);
    },
    noiseB(dur: number, type: BiquadFilterType, freq: number, peak: number, q = 1, freq2?: number) {
      if (!snd.ok() || !ctx || !master || !noise) return;
      const t = ctx.currentTime;
      const s = ctx.createBufferSource();
      s.buffer = noise;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.setValueAtTime(freq, t);
      if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + dur);
      f.Q.value = q;
      const g = ctx.createGain();
      snd.env(g, t, 0.004, peak, dur);
      s.connect(f).connect(g).connect(master);
      s.start(t, Math.random());
      s.stop(t + dur + 0.06);
    },
    /** Шыны (жоғары) не пластик/металл (төмен) сыңғыры */
    clink(glass: boolean) {
      const f = glass ? 1900 + Math.random() * 700 : 950 + Math.random() * 350;
      snd.tone(f, 0.32, "sine", 0.05);
      snd.tone(f * 2.76, 0.18, "sine", 0.02);
    },
    step() {
      snd.noiseB(0.07, "lowpass", 240, 0.05);
      snd.tone(72, 0.08, "sine", 0.035, 48);
    },
    bubble(l: number) {
      const f = 260 + Math.random() * 640;
      snd.tone(f, 0.045 + Math.random() * 0.04, "sine", 0.022 * l, f * 1.9);
    },
    pop() {
      snd.noiseB(0.14, "bandpass", 1300, 0.55, 0.7);
      snd.tone(230, 0.16, "sine", 0.3, 70);
    },
    whoosh() {
      snd.noiseB(0.38, "lowpass", 260, 0.12, 0.7, 2600);
    },
    hiss() {
      snd.noiseB(0.5, "highpass", 2800, 0.06, 0.6);
    },
    door() {
      snd.tone(130, 0.24, "sawtooth", 0.012, 185);
      snd.tone(2300, 0.03, "square", 0.008);
    },
    click() {
      snd.tone(1700, 0.03, "square", 0.025);
    },
    ding() {
      snd.tone(880, 0.4, "sine", 0.07);
      snd.tone(1320, 0.5, "sine", 0.06, null, 0.12);
    },
    buzz() {
      snd.tone(140, 0.3, "square", 0.035, 118);
    },
    drip() {
      snd.tone(1300 + Math.random() * 700, 0.05, "sine", 0.025, 2700);
    },
    crackle() {
      snd.noiseB(0.025, "highpass", 2200 + Math.random() * 2200, 0.025);
    },
    /** Құйғандағы үздіксіз сылдыр: деңгей көтерілген сайын жиілігі өседі */
    pourStart() {
      if (!snd.ok() || pour || !ctx || !master || !noise) return;
      const s = ctx.createBufferSource();
      s.buffer = noise;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 650;
      f.Q.value = 1.3;
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      s.connect(f).connect(g).connect(master);
      s.start();
      g.gain.setTargetAtTime(0.08, ctx.currentTime, 0.05);
      pour = { s, f, g };
    },
    pourLevel(x: number) {
      if (pour && ctx) pour.f.frequency.setTargetAtTime(480 + x * 1700, ctx.currentTime, 0.12);
    },
    pourStop() {
      if (!pour || !ctx) return;
      const p = pour;
      pour = null;
      p.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
      const timer = setTimeout(() => {
        timers.delete(timer);
        try {
          p.s.stop();
        } catch {
          // дыбыс бұрын тоқтаған
        }
      }, 400);
      timers.add(timer);
    },
    dispose() {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      pour = null;
      if (ctx) void ctx.close();
      ctx = null;
    },
  };
  return snd;
}
