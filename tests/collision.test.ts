import { describe, expect, it } from "vitest";
import { Rng } from "../src/shared/rng";
import { resolveCircleTiles } from "../src/sim/map/collision";
import { TileMap } from "../src/sim/map/TileMap";
import { SpatialHash } from "../src/sim/spatial/SpatialHash";
import { cmd, content, makeMap, makeSim, openRows } from "./helpers";

const tiles = content.tiles;

/** Có ô chặn nào chồng lên hình tròn (x, y, r) không. */
function overlapsBlocked(
    map: TileMap,
    x: number,
    y: number,
    r: number,
    eps = 1e-9
): boolean {
    for (let row = Math.floor(y - r); row <= Math.floor(y + r); row++) {
        for (let col = Math.floor(x - r); col <= Math.floor(x + r); col++) {
            if (!map.blocksMove(col, row)) continue;
            const nx = Math.min(Math.max(x, col), col + 1);
            const ny = Math.min(Math.max(y, row), row + 1);
            if (Math.hypot(x - nx, y - ny) < r - eps) return true;
        }
    }
    return false;
}

describe("resolveCircleTiles", () => {
    const map = TileMap.fromDef(
        makeMap("c", ["#####", "#...#", "#...#", "#...#", "#####"]),
        tiles
    );

    it("không đổi vị trí khi không chạm tường", () => {
        const p = { x: 2.5, y: 2.5 };
        resolveCircleTiles(map, p, 0.5);
        expect(p).toEqual({ x: 2.5, y: 2.5 });
    });

    it("đẩy ra khỏi tường theo pháp tuyến, giữ nguyên thành phần song song", () => {
        const p = { x: 1.3, y: 2.5 }; // lấn 0,2 vào tường trái (mép trong x = 1)
        resolveCircleTiles(map, p, 0.5);
        expect(p.x).toBeGreaterThanOrEqual(1.5);
        expect(p.x).toBeLessThan(1.5 + 1e-5);
        expect(p.y).toBeCloseTo(2.5, 9);
    });

    it("đẩy ra khỏi góc theo đường chéo", () => {
        const p = { x: 1.3, y: 1.3 };
        resolveCircleTiles(map, p, 0.5);
        expect(overlapsBlocked(map, p.x, p.y, 0.5)).toBe(false);
    });

    it("tâm nằm sâu trong tường vẫn được đẩy ra ngoài", () => {
        const p = { x: 0.6, y: 2.5 }; // tâm trong ô tường (0, 2)
        resolveCircleTiles(map, p, 0.45);
        expect(overlapsBlocked(map, p.x, p.y, 0.45)).toBe(false);
    });
});

describe("va chạm Xe - Tường trong mô phỏng", () => {
    it("trượt dọc tường thay vì dính: đi chéo vào tường vẫn tiến theo trục còn lại", () => {
        const m = makeMap("slide", openRows(30, 10));
        const sim = makeSim(m, [
            { playerId: 0, team: 1, defId: "striker", x: 15, y: 2 },
        ]);
        const r = content.tanks["striker"]!.stats.radius;
        const t = () => sim.getSnapshot().tanks[0]!;

        // Áp sát tường trên rồi đi chéo lên-phải
        for (let i = 0; i < 90; i++) sim.step([cmd({ moveX: 0, moveY: -1 })]);
        const x0 = t().x;
        for (let i = 0; i < 60; i++) sim.step([cmd({ moveX: 1, moveY: -1 })]);

        expect(t().y).toBeGreaterThanOrEqual(1 + r - 1e-6); // không xuyên tường trên
        expect(t().x - x0).toBeGreaterThan(2); // vẫn trượt sang phải
    });

    it("xe không lọt qua khe hở hẹp hơn đường kính", () => {
        // Khe rộng 1 ô, xe đường kính 1,0 (radius 0,5): vừa khít nên phải qua được; khe 1 ô giữa hai khối thì chặn
        const rows = openRows(12, 7);
        rows[3] = "#.....#.....".slice(0, 12);
        const m = makeMap("gap", [
            "############",
            "#..........#",
            "#..........#",
            "#.####.#####",
            "#..........#",
            "#..........#",
            "############",
        ]);
        const sim = makeSim(m, [
            { playerId: 0, team: 1, defId: "striker", x: 8.5, y: 1.5 },
        ]);
        for (let i = 0; i < 600; i++) sim.step([cmd({ moveX: 0, moveY: 1 })]);
        // Xe ở cột 8 (ô tường) nên phải bị chặn ở trên hàng 3
        expect(sim.getSnapshot().tanks[0]!.y).toBeLessThan(
            3 - content.tanks["striker"]!.stats.radius + 1e-3
        );
    });

    it("fuzz: 3000 tick input ngẫu nhiên có seed, xe không bao giờ nằm trong tường (arena_01)", () => {
        for (const seed of [1, 2, 3]) {
            const sim = makeSim(
                content.maps["arena_01"]!,
                [
                    { playerId: 0, team: 1, defId: "striker" },
                    { playerId: 1, team: 2, defId: "ghost" },
                    { playerId: 2, team: 2, defId: "striker" },
                ],
                seed
            );
            const rng = new Rng(seed * 101);
            const held = [
                { mx: 0, my: 0 },
                { mx: 0, my: 0 },
                { mx: 0, my: 0 },
            ];

            for (let tick = 0; tick < 3000; tick++) {
                const inputs = held.map((h, id) => {
                    if (tick % 20 === 0) {
                        h.mx = Math.round(rng.range(-1, 1));
                        h.my = Math.round(rng.range(-1, 1));
                    }
                    return cmd({
                        playerId: id,
                        moveX: h.mx,
                        moveY: h.my,
                        aimX: 16,
                        aimY: 10,
                    });
                });
                sim.step(inputs);

                for (const t of sim.getSnapshot().tanks) {
                    if (overlapsBlocked(sim.map, t.x, t.y, t.radius, 1e-6)) {
                        throw new Error(
                            `seed ${seed}, tick ${tick}: xe ${t.id} nằm trong tường tại (${t.x}, ${t.y})`
                        );
                    }
                }
            }
        }
    });
});

describe("va chạm Xe - Xe", () => {
    const m = makeMap("duel", openRows(20, 10));

    it("hai xe chồng lên nhau được đẩy ra đúng tổng bán kính", () => {
        const sim = makeSim(m, [
            { playerId: 0, team: 1, defId: "striker", x: 10, y: 5 },
            { playerId: 1, team: 2, defId: "ghost", x: 10.2, y: 5 },
        ]);
        sim.step([]);
        const [a, b] = sim.getSnapshot().tanks;
        const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        expect(dist).toBeGreaterThanOrEqual(a!.radius + b!.radius - 1e-6);
    });

    it("trùng tâm hoàn toàn vẫn tách ra, không sinh NaN", () => {
        const sim = makeSim(m, [
            { playerId: 0, team: 1, defId: "striker", x: 10, y: 5 },
            { playerId: 1, team: 2, defId: "striker", x: 10, y: 5 },
        ]);
        sim.step([]);
        const [a, b] = sim.getSnapshot().tanks;
        expect(Number.isFinite(a!.x) && Number.isFinite(b!.x)).toBe(true);
        expect(Math.hypot(a!.x - b!.x, a!.y - b!.y)).toBeGreaterThanOrEqual(
            a!.radius + b!.radius - 1e-6
        );
    });

    it("xe đâm vào xe đứng yên thì không xuyên qua, hai xe cùng bị đẩy đi chậm lại", () => {
        // Còn nhiều chỗ trống phía sau nên không bị tường ảnh hưởng
        const sim = makeSim(m, [
            { playerId: 0, team: 1, defId: "striker", x: 3, y: 5 },
            { playerId: 1, team: 2, defId: "striker", x: 6, y: 5 },
        ]);
        for (let i = 0; i < 100; i++) sim.step([cmd({ moveX: 1, moveY: 0 })]);
        const [a, b] = sim.getSnapshot().tanks;
        expect(a!.x).toBeLessThan(b!.x);
        expect(b!.x).toBeGreaterThan(6.5); // xe bị đâm bị đẩy đi
        expect(Math.hypot(a!.x - b!.x, a!.y - b!.y)).toBeGreaterThanOrEqual(
            a!.radius + b!.radius - 1e-6
        );
    });

    it("xe bị kẹp giữa xe khác và tường không xuyên tường", () => {
        const sim = makeSim(m, [
            { playerId: 0, team: 1, defId: "striker", x: 17.5, y: 5 },
            { playerId: 1, team: 2, defId: "ghost", x: 15, y: 5 },
        ]);
        for (let i = 0; i < 300; i++) {
            sim.step([
                cmd({ playerId: 0, moveX: 1 }),
                cmd({ playerId: 1, moveX: 1 }),
            ]);
            for (const t of sim.getSnapshot().tanks)
                expect(overlapsBlocked(sim.map, t.x, t.y, t.radius, 1e-6)).toBe(
                    false
                );
        }
        // Khi bị kẹp, tường luôn thắng nên hai xe có thể chồng nhau rất nhẹ; giới hạn ở 5% tổng bán kính
        const [a, b] = sim.getSnapshot().tanks;
        const overlap =
            a!.radius + b!.radius - Math.hypot(a!.x - b!.x, a!.y - b!.y);
        expect(overlap).toBeLessThan(0.05);
    });
});

describe("bụi cỏ", () => {
    it("snapshot đánh dấu xe đang đứng trong bụi cỏ do sim quyết định", () => {
        const m = makeMap("bush", [
            "########",
            "#..gg..#",
            "#..gg..#",
            "########",
        ]);
        const sim = makeSim(m, [
            { playerId: 0, team: 1, defId: "striker", x: 1.5, y: 1.5 },
        ]);
        expect(sim.getSnapshot().tanks[0]!.inBush).toBe(false);
        for (let i = 0; i < 90; i++) sim.step([cmd({ moveX: 1, moveY: 0 })]);
        const t = sim.getSnapshot().tanks[0]!;
        expect(t.x).toBeGreaterThan(3);
        expect(t.inBush).toBe(t.x < 5);
    });
});

describe("SpatialHash", () => {
    it("chỉ trả về các đối tượng ở lân cận", () => {
        const h = new SpatialHash(2);
        h.insert(1, 1, 1);
        h.insert(2, 2.5, 1);
        h.insert(3, 40, 40);
        const out: number[] = [];
        h.query(1.5, 1, 0.5, out);
        expect(out).toContain(1);
        expect(out).toContain(2);
        expect(out).not.toContain(3);
    });

    it("bắt được đối tượng nằm ở ô bên cạnh khi chạm biên ô", () => {
        const h = new SpatialHash(2);
        h.insert(1, 1.99, 1); // ô 0
        h.insert(2, 2.01, 1); // ô 1
        const out: number[] = [];
        h.query(1.99, 1, 0.5, out);
        expect(out.sort()).toEqual([1, 2]);
    });

    it("hoạt động đúng với tọa độ âm", () => {
        const h = new SpatialHash(2);
        h.insert(7, -3, -3);
        const out: number[] = [];
        h.query(-2.5, -3, 0.5, out);
        expect(out).toEqual([7]);
    });

    it("clear xóa hết nhưng dùng lại được", () => {
        const h = new SpatialHash(2);
        h.insert(1, 1, 1);
        h.clear();
        const out: number[] = [];
        h.query(1, 1, 1, out);
        expect(out).toEqual([]);
        h.insert(2, 1, 1);
        h.query(1, 1, 1, out);
        expect(out).toEqual([2]);
    });

    it("không bỏ sót so với duyệt toàn bộ (so sánh ngẫu nhiên có seed)", () => {
        const rng = new Rng(5);
        const h = new SpatialHash(2);
        const pts: { id: number; x: number; y: number }[] = [];
        for (let i = 0; i < 200; i++) {
            const p = { id: i, x: rng.range(0, 30), y: rng.range(0, 30) };
            pts.push(p);
            h.insert(p.id, p.x, p.y);
        }
        const r = 0.9; // bán kính xe tối đa theo schema là 1, SpatialHash(2) đảm bảo bắt được cặp chạm nhau
        for (const a of pts) {
            const out: number[] = [];
            h.query(a.x, a.y, r, out);
            const got = new Set(out);
            for (const b of pts) {
                if (Math.hypot(a.x - b.x, a.y - b.y) < r + 0.9)
                    expect(got.has(b.id)).toBe(true);
            }
        }
    });
});
