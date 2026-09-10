class SoundManager {
  private ctx: AudioContext | undefined;
  private muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem("sc_muted") === "true";
    } catch {
      this.muted = false;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem("sc_muted", String(this.muted));
    } catch {
      // Storage unavailable
    }
    return this.muted;
  }

  private initCtx(): AudioContext | undefined {
    if (this.ctx === undefined && typeof AudioContext !== "undefined") {
      try {
        this.ctx = new AudioContext();
      } catch {
        // AudioContext not supported
      }
    }
    if (this.ctx?.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = "sine",
    gainVal = 0.1,
  ): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (ctx === undefined) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio node failure ignored
    }
  }

  click(): void {
    this.playTone(600, 0.04, "sine", 0.05);
  }

  threat(): void {
    this.playTone(180, 0.35, "sawtooth", 0.08);
  }

  challenge(): void {
    this.playTone(520, 0.2, "square", 0.08);
    setTimeout(() => this.playTone(680, 0.25, "square", 0.08), 80);
  }

  reveal(): void {
    this.playTone(330, 0.15, "triangle", 0.1);
    setTimeout(() => this.playTone(440, 0.15, "triangle", 0.1), 100);
    setTimeout(() => this.playTone(550, 0.25, "triangle", 0.1), 200);
  }

  elimination(): void {
    this.playTone(220, 0.3, "sawtooth", 0.1);
    setTimeout(() => this.playTone(140, 0.4, "sawtooth", 0.12), 200);
  }

  victory(): void {
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.3, "triangle", 0.12), idx * 120);
    });
  }
}

export const sounds = new SoundManager();
