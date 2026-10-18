/**
 * PRNG có seed (mulberry32). Simulation chỉ được dùng bộ này,
 * không dùng Math.random để đảm bảo xác định (deterministic).
 */
export class Rng {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0;
    }

    /** Số thực trong [0, 1). */
    next(): number {
        this.state = (this.state + 0x6d2b79f5) >>> 0;
        let t = this.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /** Số thực trong [min, max). */
    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }
}
