import { describe, expect, it } from "vitest";
import { STEP } from "../src/shared/constants";
import { angleDiff } from "../src/shared/math/angle";
import type { InputCmd } from "../src/shared/protocol";
import { Rng } from "../src/shared/rng";
import { Simulation } from "../src/sim/Simulation";
import { cmd, content, makeMap, makeSim, openRows } from "./helpers";

const COLS = 40;
const ROWS = 24;
const OPEN = makeMap("open", openRows(COLS, ROWS));
const striker = content.tanks["striker"]!;
const ghost = content.tanks["ghost"]!;

function makeOpenSim(seed = 1): Simulation {
    return makeSim(
        OPEN,
        [
            { playerId: 0, team: 1, defId: "striker", x: 20, y: 12 },
            { playerId: 1, team: 2, defId: "ghost", x: 30, y: 12 },
        ],
        seed
    );
}

const me = (sim: Simulation) =>
    sim.getSnapshot().tanks.find((t) => t.playerId === 0)!;

function run(sim: Simulation, ticks: number, input: Partial<InputCmd>): void {
    for (let i = 0; i < ticks; i++)
        sim.step([cmd({ aimX: 30, aimY: 12, ...input })]);
}

describe("Simulation: khởi tạo", () => {
    it("tạo xe từ dữ liệu và phát sự kiện TankSpawned", () => {
        const sim = makeOpenSim();
        expect(sim.getSnapshot().tanks).toHaveLength(2);
        expect(sim.drainEvents().map((e) => e.type)).toEqual([
            "TankSpawned",
            "TankSpawned",
        ]);
        expect(sim.drainEvents()).toHaveLength(0);
    });

    it("báo lỗi khi defId hoặc bản đồ không tồn tại", () => {
        expect(() =>
            makeSim(OPEN, [{ playerId: 0, team: 1, defId: "nope", x: 5, y: 5 }])
        ).toThrow(/nope/);
        expect(
            () =>
                new Simulation(
                    { seed: 1, mapId: "khong_co", players: [] },
                    content
                )
        ).toThrow(/khong_co/);
    });

    it("xuất phát tại điểm của đội trên bản đồ khi không chỉ định vị trí", () => {
        const sim = new Simulation(
            {
                seed: 1,
                mapId: "arena_01",
                players: [
                    { playerId: 0, team: 1, defId: "striker" },
                    { playerId: 1, team: 1, defId: "striker" },
                    { playerId: 2, team: 2, defId: "ghost" },
                ],
            },
            content
        );
        const [a, b, c] = sim.getSnapshot().tanks;
        const team1 = sim.map.spawnPoints(1);
        const team2 = sim.map.spawnPoints(2);
        expect([a!.x, a!.y]).toEqual([team1[0]!.x, team1[0]!.y]);
        expect([b!.x, b!.y]).toEqual([team1[1]!.x, team1[1]!.y]); // người thứ hai của đội dùng điểm kế tiếp
        expect([c!.x, c!.y]).toEqual([team2[0]!.x, team2[0]!.y]);
    });

    it("báo lỗi khi bản đồ không có điểm xuất phát cho đội", () => {
        expect(() =>
            makeSim(OPEN, [{ playerId: 0, team: 1, defId: "striker" }])
        ).toThrow(/đội 1/);
    });
});

describe("Simulation: Dual-Pivot", () => {
    it("không có input thì xe đứng yên", () => {
        const sim = makeOpenSim();
        const before = me(sim);
        for (let i = 0; i < 60; i++) sim.step([]);
        expect(me(sim).x).toBe(before.x);
        expect(me(sim).y).toBe(before.y);
    });

    it("thân xe quay theo hướng di chuyển, tháp pháo vẫn chĩa đúng điểm ngắm", () => {
        const sim = makeOpenSim();
        // Ngắm sang phải (cùng hàng với xe) nhưng đi sang trái: thân phải quay 180°, tháp pháo giữ nguyên 0
        run(sim, 120, { moveX: -1, moveY: 0, aimX: 38, aimY: 12 });
        const t = me(sim);
        expect(Math.abs(angleDiff(t.hullAngle, Math.PI))).toBeLessThan(1e-6);
        expect(Math.abs(t.turretAngle)).toBeLessThan(1e-9);
        expect(t.x).toBeLessThan(20);
    });

    it("tháp pháo xoay về phía con trỏ", () => {
        const sim = makeOpenSim();
        run(sim, 30, { aimX: 20, aimY: 2 }); // phía trên xe: góc -90° (y hướng xuống)
        expect(me(sim).turretAngle).toBeCloseTo(-Math.PI / 2, 6);
    });

    it("tháp pháo bị giới hạn bởi turretTurnRate", () => {
        const sim = makeOpenSim();
        sim.step([cmd({ aimX: 20, aimY: 2 })]);
        expect(Math.abs(me(sim).turretAngle)).toBeLessThanOrEqual(
            striker.stats.turretTurnRate * STEP + 1e-9
        );
    });

    it("con trỏ nằm đúng tâm xe thì giữ nguyên góc, không nhảy", () => {
        const sim = makeOpenSim();
        run(sim, 30, { aimX: 20, aimY: 2 });
        const before = me(sim).turretAngle;
        run(sim, 5, { aimX: 20, aimY: 12 });
        expect(me(sim).turretAngle).toBe(before);
    });
});

describe("Simulation: di chuyển", () => {
    it("đi chéo không nhanh hơn đi thẳng", () => {
        const sim = makeOpenSim();
        run(sim, 60, { moveX: 1, moveY: 1 }); // cho thân quay xong hướng chéo trước
        const a = me(sim);
        sim.step([cmd({ moveX: 1, moveY: 1, aimX: 30, aimY: 12 })]);
        const b = me(sim);
        expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThanOrEqual(
            striker.stats.moveSpeed * STEP + 1e-9
        );
    });

    it("xe dừng ở tường viền, không rời bản đồ", () => {
        const sim = makeSim(OPEN, [
            { playerId: 0, team: 1, defId: "striker", x: 20, y: 12 },
        ]);
        run(sim, 1200, { moveX: 1, moveY: 0 });
        expect(me(sim).x).toBeGreaterThan(
            COLS - 1 - striker.stats.radius - 1e-3
        );
        expect(me(sim).x).toBeLessThanOrEqual(
            COLS - 1 - striker.stats.radius + 1e-6
        );
        run(sim, 1200, { moveX: 0, moveY: -1 });
        expect(me(sim).y).toBeLessThan(1 + striker.stats.radius + 1e-3);
        expect(me(sim).y).toBeGreaterThanOrEqual(
            1 + striker.stats.radius - 1e-6
        );
    });

    it("input NaN/Infinity không làm hỏng trạng thái", () => {
        const sim = makeOpenSim();
        run(sim, 10, {
            moveX: NaN,
            moveY: Infinity,
            aimX: NaN,
            aimY: -Infinity,
        });
        const t = me(sim);
        for (const v of [t.x, t.y, t.hullAngle, t.turretAngle])
            expect(Number.isFinite(v)).toBe(true);
    });

    it("vector di chuyển quá dài bị chuẩn hóa", () => {
        const a = makeOpenSim();
        const b = makeOpenSim();
        run(a, 60, { moveX: 1, moveY: 0 });
        run(b, 60, { moveX: 100, moveY: 0 });
        expect(me(b).x).toBeCloseTo(me(a).x, 9);
    });
});

describe("Simulation: xác định (deterministic)", () => {
    function randomInputs(seed: number, ticks: number): InputCmd[] {
        const rng = new Rng(seed);
        const out: InputCmd[] = [];
        for (let i = 0; i < ticks; i++) {
            out.push(
                cmd({
                    tick: i,
                    moveX: Math.round(rng.range(-1, 1)),
                    moveY: Math.round(rng.range(-1, 1)),
                    aimX: rng.range(0, COLS),
                    aimY: rng.range(0, ROWS),
                })
            );
        }
        return out;
    }

    it("cùng chuỗi input cho cùng snapshot", () => {
        const inputs = randomInputs(42, 2000);
        const a = makeOpenSim();
        const b = makeOpenSim();
        for (const i of inputs) {
            a.step([i]);
            b.step([i]);
        }
        expect(JSON.stringify(a.getSnapshot())).toBe(
            JSON.stringify(b.getSnapshot())
        );
    });

    it("input khác thì snapshot khác (bài test không vô nghĩa)", () => {
        const a = makeOpenSim();
        const b = makeOpenSim();
        for (const i of randomInputs(1, 300)) a.step([i]);
        for (const i of randomInputs(2, 300)) b.step([i]);
        expect(JSON.stringify(a.getSnapshot())).not.toBe(
            JSON.stringify(b.getSnapshot())
        );
    });

    it("Rng cùng seed cho cùng dãy số", () => {
        const a = new Rng(7);
        const b = new Rng(7);
        for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
    });

    it("dữ liệu hai xe khác nhau như mong đợi", () => {
        expect(ghost.stats.moveSpeed).toBeGreaterThan(striker.stats.moveSpeed);
    });
});
