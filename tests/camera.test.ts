import { describe, expect, it } from "vitest";
import { Camera } from "../src/client/render/Camera";

describe("Camera", () => {
    it("điểm camera đang theo nằm giữa màn hình", () => {
        const cam = new Camera();
        cam.setViewport(1000, 600);
        cam.follow(12, 7);
        const s = cam.worldToScreen(12, 7);
        expect(s.x).toBeCloseTo(500, 9);
        expect(s.y).toBeCloseTo(300, 9);
    });

    it("screenToWorld và worldToScreen là hai chiều nghịch đảo", () => {
        const cam = new Camera();
        cam.setViewport(1280, 720);
        cam.zoom = 40;
        cam.follow(3.3, -4.1);
        const w = cam.screenToWorld(321, 654);
        const s = cam.worldToScreen(w.x, w.y);
        expect(s.x).toBeCloseTo(321, 9);
        expect(s.y).toBeCloseTo(654, 9);
    });

    it("con trỏ ở giữa màn hình ngắm đúng vị trí camera", () => {
        const cam = new Camera();
        cam.setViewport(800, 600);
        cam.follow(5, 6);
        const w = cam.screenToWorld(400, 300);
        expect(w.x).toBeCloseTo(5, 9);
        expect(w.y).toBeCloseTo(6, 9);
    });
});
