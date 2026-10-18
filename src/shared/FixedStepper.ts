import { STEP } from "./constants";

/**
 * Bộ tích lũy thời gian cho vòng lặp fixed timestep.
 * Thuần logic (không đụng DOM) nên client và server dùng chung, test được.
 */
export class FixedStepper {
  private acc = 0;

  constructor(
    readonly step: number = STEP,
    /** Giới hạn thời gian của một khung hình, chống "spiral of death". */
    readonly maxFrame: number = 0.25,
  ) {}

  /**
   * Cộng thời gian của khung hình, gọi onStep cho mỗi bước cố định cần chạy.
   * @returns alpha trong [0, 1]: phần dư chưa mô phỏng, dùng để nội suy khi vẽ.
   */
  advance(frameSeconds: number, onStep: () => void): number {
    this.acc += Math.min(Math.max(frameSeconds, 0), this.maxFrame);
    const eps = 1e-9;
    while (this.acc >= this.step - eps) {
      onStep();
      this.acc -= this.step;
    }
    return Math.min(1, Math.max(0, this.acc / this.step));
  }

  reset(): void {
    this.acc = 0;
  }
}
