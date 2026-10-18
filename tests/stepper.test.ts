import { describe, expect, it } from "vitest";
import { STEP } from "../src/shared/constants";
import { FixedStepper } from "../src/shared/FixedStepper";

describe("FixedStepper", () => {
    it("chạy đúng số bước cố định cho thời gian khung hình", () => {
        const s = new FixedStepper();
        let n = 0;
        s.advance(STEP * 3, () => n++);
        expect(n).toBe(3);
    });

    it("tích lũy phần dư giữa các khung hình", () => {
        const s = new FixedStepper();
        let n = 0;
        s.advance(STEP * 0.6, () => n++);
        expect(n).toBe(0);
        s.advance(STEP * 0.6, () => n++);
        expect(n).toBe(1);
    });

    it("trả alpha trong [0, 1]", () => {
        const s = new FixedStepper();
        const alpha = s.advance(STEP * 1.5, () => {});
        expect(alpha).toBeGreaterThanOrEqual(0);
        expect(alpha).toBeLessThanOrEqual(1);
        expect(alpha).toBeCloseTo(0.5, 6);
    });

    it("chặn khung hình quá dài (spiral of death)", () => {
        const s = new FixedStepper();
        let n = 0;
        s.advance(10, () => n++);
        expect(n).toBeLessThanOrEqual(Math.ceil(0.25 / STEP));
    });

    it("bỏ qua dt âm", () => {
        const s = new FixedStepper();
        let n = 0;
        s.advance(-1, () => n++);
        expect(n).toBe(0);
    });
});
