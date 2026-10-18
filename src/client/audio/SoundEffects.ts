/**
 * Hệ thống âm thanh tổng hợp thời gian thực bằng Web Audio API.
 * Không cần tải file âm thanh ngoài, hoàn toàn độc lập và không bao giờ lỗi mạng.
 */
export class SoundEffects {
  private ctx: AudioContext | null = null;
  enabled = true;
  masterVolume = 0.35;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof AudioContext !== "undefined") {
      this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Âm thanh đại bác khi xe bắn */
  playFire(isLocal = true): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const vol = this.masterVolume * (isLocal ? 1.0 : 0.6);

    // Tiếng trầm va đập của nòng pháo (pitch drop)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(isLocal ? 180 : 140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.14);
    oscGain.gain.setValueAtTime(vol * 0.9, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);

    // Tiếng nổ bột thuốc súng (noise burst)
    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.12);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t);
  }

  /** Đạn bắn trúng giáp xe khác */
  playHitTank(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);

    gain.gain.setValueAtTime(this.masterVolume * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** Đạn bắn trúng tường (gạch/thép) */
  playHitWall(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.06);

    gain.gain.setValueAtTime(this.masterVolume * 0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /** Vụ nổ lớn khi xe bị phá hủy hoàn toàn */
  playDestroy(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(40, t + 0.6);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.masterVolume * 1.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    // Thêm âm trầm phụ (sub-bass boom)
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(100, t);
    sub.frequency.exponentialRampToValueAtTime(20, t + 0.5);
    subGain.gain.setValueAtTime(this.masterVolume * 1.0, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);

    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(t);
    sub.stop(t + 0.5);
  }

  /** Hiệu ứng âm thanh khi xe hồi sinh */
  playRespawn(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.3);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(this.masterVolume * 0.4, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }
}
