import { FixedStepper } from "../shared/FixedStepper";

export interface LoopCallbacks {
    /** Chạy đúng một tick mô phỏng (có thể gọi 0, 1 hoặc nhiều lần mỗi khung hình). */
    update(): void;
    /** Vẽ một khung hình. alpha in [0, 1] dùng để nội suy giữa hai tick. */
    render(alpha: number, frameSeconds: number): void;
}

/** Vòng lặp fixed timestep cho mô phỏng, vẽ theo requestAnimationFrame. */
export class GameLoop {
    private readonly stepper = new FixedStepper();
    private rafId = 0;
    private running = false;
    private last = 0;

    constructor(private readonly callbacks: LoopCallbacks) {}

    start(): void {
        if (this.running) return;
        this.running = true;
        this.stepper.reset();
        this.last = performance.now();

        const frame = (now: number) => {
            if (!this.running) return;
            const dt = (now - this.last) / 1000;
            this.last = now;
            const alpha = this.stepper.advance(dt, () =>
                this.callbacks.update()
            );
            this.callbacks.render(alpha, dt);
            this.rafId = requestAnimationFrame(frame);
        };
        this.rafId = requestAnimationFrame(frame);
    }

    stop(): void {
        this.running = false;
        cancelAnimationFrame(this.rafId);
    }
}
