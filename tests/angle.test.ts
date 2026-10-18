import { describe, expect, it } from "vitest";
import { angleDiff, turnToward, wrap } from "../src/shared/math/angle";

const deg = (d: number) => (d * Math.PI) / 180;

describe("wrap", () => {
    it("đưa góc về [-π, π]", () => {
        expect(wrap(deg(190))).toBeCloseTo(deg(-170), 9);
        expect(wrap(deg(-190))).toBeCloseTo(deg(170), 9);
        expect(wrap(deg(720 + 30))).toBeCloseTo(deg(30), 9);
        expect(wrap(0)).toBe(0);
    });
});

describe("angleDiff", () => {
    it("chọn đường ngắn nhất khi vượt ±π", () => {
        expect(angleDiff(deg(170), deg(-170))).toBeCloseTo(deg(20), 9);
        expect(angleDiff(deg(-170), deg(170))).toBeCloseTo(deg(-20), 9);
    });

    it("không nhảy góc khi hai góc bằng nhau", () => {
        expect(angleDiff(1.234, 1.234)).toBeCloseTo(0, 12);
    });
});

describe("turnToward", () => {
    it("chỉ xoay tối đa maxStep mỗi lần", () => {
        expect(turnToward(0, deg(90), deg(10))).toBeCloseTo(deg(10), 9);
        expect(turnToward(0, deg(-90), deg(10))).toBeCloseTo(deg(-10), 9);
    });

    it("không vượt quá mục tiêu", () => {
        expect(turnToward(deg(80), deg(90), deg(30))).toBeCloseTo(deg(90), 9);
    });

    it("xoay đường ngắn qua ±π thay vì đường dài", () => {
        // từ 170° sang -170° phải tăng góc (qua 180°), không quay ngược 340°
        const next = turnToward(deg(170), deg(-170), deg(10));
        expect(Math.abs(angleDiff(next, deg(180)))).toBeCloseTo(0, 9);
    });

    it("hội tụ về mục tiêu sau đủ bước", () => {
        let a = deg(-170);
        for (let i = 0; i < 100; i++) a = turnToward(a, deg(170), deg(5));
        expect(angleDiff(a, deg(170))).toBeCloseTo(0, 9);
    });

    it("maxStep = Infinity là ngắm tức thời", () => {
        expect(turnToward(0, deg(123), Infinity)).toBeCloseTo(deg(123), 9);
    });
});
