import { describe, expect, it } from "vitest";
import { RESPAWN_TICKS, SPAWN_PROTECTION_TICKS } from "../src/shared/constants";
import { segmentCircleT } from "../src/shared/math/segment";
import type { GameEvent, InputCmd } from "../src/shared/protocol";
import { Rng } from "../src/shared/rng";
import { mitigate } from "../src/sim/combat/combat";
import { raycastTiles } from "../src/sim/map/raycast";
import { TileMap } from "../src/sim/map/TileMap";
import type { PlayerConfig, Simulation } from "../src/sim/Simulation";
import { cmd, content, makeMap, makeSim, openRows } from "./helpers";

const striker = content.tanks["striker"]!;
const ghost = content.tanks["ghost"]!;
const basic = content.projectiles[striker.weapon.projectile]!;
const fireTicks = Math.round(striker.weapon.fireInterval * 60);

const OPEN = makeMap("combat_open", openRows(30, 12));

/** Bản đồ trống có một cột dọc toàn ký tự `glyph` tại cột `col`. */
function mapWithColumn(id: string, glyph: string, col: number) {
    const rows = openRows(30, 12).map((r, i) =>
        i === 0 || i === 11 ? r : r.slice(0, col) + glyph + r.slice(col + 1)
    );
    return makeMap(id, rows);
}

const shooter: PlayerConfig = {
    playerId: 0,
    team: 1,
    defId: "striker",
    x: 5,
    y: 6.5,
};
const enemy: PlayerConfig = {
    playerId: 1,
    team: 2,
    defId: "ghost",
    x: 15,
    y: 6.5,
};

/** Chạy n tick; người chơi 0 ngắm sang phải. Trả về mọi sự kiện phát sinh. */
function run(
    sim: Simulation,
    ticks: number,
    over: Partial<InputCmd> = {}
): GameEvent[] {
    const events: GameEvent[] = [];
    for (let i = 0; i < ticks; i++) {
        sim.step([cmd({ playerId: 0, aimX: 29, aimY: 6.5, ...over })]);
        events.push(...sim.drainEvents());
    }
    return events;
}

const ofType = <T extends GameEvent["type"]>(events: GameEvent[], type: T) =>
    events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

const tankOf = (sim: Simulation, playerId: number) =>
    sim.getSnapshot().tanks.find((t) => t.playerId === playerId);

/** Tạo sim, bỏ qua sự kiện xuất phát và chờ hết thời gian bảo vệ. */
function readySim(
    map = OPEN,
    players: PlayerConfig[] = [shooter, enemy],
    seed = 1
): Simulation {
    const sim = makeSim(map, players, seed);
    run(sim, SPAWN_PROTECTION_TICKS);
    sim.drainEvents();
    return sim;
}

describe("Bắn", () => {
    it("giữ nút bắn: bắn liên tục theo nhịp fireInterval", () => {
        const sim = makeSim(OPEN, [shooter]);
        const fired = ofType(
            run(sim, fireTicks * 3 + 1, { fire: true }),
            "ProjectileFired"
        );
        expect(fired).toHaveLength(4); // tick 0, n, 2n, 3n
    });

    it("đạn xuất hiện ở đầu nòng và bay theo hướng tháp pháo", () => {
        const sim = makeSim(OPEN, [shooter]);
        const [shot] = ofType(run(sim, 1, { fire: true }), "ProjectileFired");
        expect(shot!.x).toBeCloseTo(5 + striker.weapon.muzzleOffset[0], 6);
        expect(shot!.y).toBeCloseTo(6.5, 6);
        const spread = ((striker.weapon.spreadDeg ?? 0) * Math.PI) / 180;
        expect(Math.abs(shot!.angle)).toBeLessThanOrEqual(spread + 1e-9);

        const [p] = sim.getSnapshot().projectiles;
        expect(p!.x).toBeGreaterThan(shot!.x);
        expect(p!.team).toBe(1);
    });

    it("snapshot báo tiến độ nạp đạn", () => {
        const sim = makeSim(OPEN, [shooter]);
        expect(tankOf(sim, 0)!.reload).toBe(1);
        run(sim, 1, { fire: true });
        expect(tankOf(sim, 0)!.reload).toBeLessThan(0.1);
        run(sim, fireTicks);
        expect(tankOf(sim, 0)!.reload).toBe(1);
    });

    it("không bắn khi không giữ nút", () => {
        const sim = makeSim(OPEN, [shooter]);
        expect(ofType(run(sim, 120), "ProjectileFired")).toHaveLength(0);
    });
});

describe("Đạn trúng xe", () => {
    it("trừ máu theo công thức giáp và ghi người bắn", () => {
        const sim = readySim();
        const events = run(sim, 60, { fire: false }).concat(
            run(sim, 1, { fire: true }),
            run(sim, 60)
        );
        const [hit] = ofType(events, "TankDamaged");
        const expected = mitigate(basic.damage, ghost.stats.armor);
        expect(hit!.amount).toBeCloseTo(expected, 9);
        expect(hit!.byPlayerId).toBe(0);
        expect(tankOf(sim, 1)!.hp).toBeCloseTo(ghost.stats.maxHp - expected, 9);
        expect(sim.getSnapshot().projectiles).toHaveLength(0);
    });

    it("công thức giáp: dmg * 100 / (100 + armor)", () => {
        expect(mitigate(100, 0)).toBe(100);
        expect(mitigate(100, 100)).toBe(50);
    });

    it("đạn bay xuyên qua đồng đội, không gây sát thương", () => {
        const ally: PlayerConfig = {
            playerId: 2,
            team: 1,
            defId: "ghost",
            x: 10,
            y: 6.5,
        };
        const sim = readySim(OPEN, [shooter, enemy, ally]);
        run(sim, 1, { fire: true });
        run(sim, 60);
        expect(tankOf(sim, 2)!.hp).toBe(ghost.stats.maxHp);
        expect(tankOf(sim, 1)!.hp).toBeLessThan(ghost.stats.maxHp);
    });

    it("xe vừa xuất hiện được bảo vệ: đạn bị chặn nhưng không trừ máu", () => {
        const sim = makeSim(OPEN, [shooter, enemy]);
        const events = run(sim, 1, { fire: true }).concat(run(sim, 40));
        expect(ofType(events, "ProjectileHit").map((e) => e.kind)).toEqual([
            "tank",
        ]);
        expect(ofType(events, "TankDamaged")).toHaveLength(0);
        expect(tankOf(sim, 1)!.hp).toBe(ghost.stats.maxHp);
        expect(tankOf(sim, 1)!.invulnerable).toBe(true);
    });

    it("bắn thì mất bảo vệ ngay", () => {
        const sim = makeSim(OPEN, [shooter]);
        expect(tankOf(sim, 0)!.invulnerable).toBe(true);
        run(sim, 1, { fire: true });
        expect(tankOf(sim, 0)!.invulnerable).toBe(false);
    });
});

describe("Đạn và tường", () => {
    it("dừng ở tường thép, tường không đổi", () => {
        const m = mapWithColumn("steel_col", "#", 10);
        const sim = makeSim(m, [shooter]);
        const events = run(sim, 1, { fire: true }).concat(run(sim, 60));
        const [hit] = ofType(events, "ProjectileHit");
        expect(hit!.kind).toBe("wall");
        expect(hit!.x).toBeCloseTo(10, 6);
        expect(ofType(events, "TileDamaged")).toHaveLength(0);
        expect(sim.map.tileAt(10, 6)?.id).toBe("steel");
    });

    it("tường gạch vỡ sau đủ số phát và trở thành đất", () => {
        const m = mapWithColumn("brick_col", "B", 10);
        const sim = makeSim(m, [shooter]);
        const brickHp = content.tiles.find((t) => t.id === "brick")!.hp!;
        const events = run(sim, fireTicks * brickHp, { fire: true }).concat(
            run(sim, 60)
        );

        const damaged = ofType(events, "TileDamaged");
        expect(damaged.map((e) => e.hp)).toEqual(
            Array.from({ length: brickHp }, (_, i) => brickHp - 1 - i)
        );
        expect(ofType(events, "TileChanged")).toEqual([
            { type: "TileChanged", col: 10, row: 6, tileId: "floor" },
        ]);
        expect(sim.map.blocksMove(10, 6)).toBe(false);
        expect(sim.map.blocksProjectile(10, 6)).toBe(false);
    });

    it("xe áp sát tường (đầu nòng nằm trong tường) vẫn không bắn xuyên", () => {
        const m = mapWithColumn("hug", "B", 10);
        const sim = makeSim(m, [
            { ...shooter, x: 10 - striker.stats.radius - 0.01 },
        ]);
        const events = run(sim, 1, { fire: true });
        expect(ofType(events, "ProjectileHit").map((e) => e.kind)).toEqual([
            "wall",
        ]);
        expect(ofType(events, "TileDamaged")).toHaveLength(1);
        expect(sim.getSnapshot().projectiles).toHaveLength(0);
    });

    it("hết tầm bay thì biến mất, quãng bay đúng bằng range", () => {
        const sim = makeSim(OPEN, [shooter]);
        const events = run(sim, 1, { fire: true }).concat(run(sim, 120));
        const [shot] = ofType(events, "ProjectileFired");
        const [end] = ofType(events, "ProjectileHit");
        expect(end!.kind).toBe("expire");
        expect(Math.hypot(end!.x - shot!.x, end!.y - shot!.y)).toBeCloseTo(
            basic.range,
            6
        );
    });
});

describe("Hạ xe và hồi sinh", () => {
    it("xe hết máu bị hạ, tính điểm, rồi hồi sinh đầy máu sau RESPAWN_TICKS", () => {
        const sim = readySim();
        const victimId = tankOf(sim, 1)!.id;
        sim.world.health.get(victimId)!.hp = 1;

        const events = run(sim, 1, { fire: true }).concat(run(sim, 60));
        const [destroyed] = ofType(events, "TankDestroyed");
        expect(destroyed).toMatchObject({
            id: victimId,
            playerId: 1,
            byPlayerId: 0,
        });
        expect(tankOf(sim, 1)).toBeUndefined();

        const players = sim.getSnapshot().players;
        expect(players.find((p) => p.playerId === 0)).toMatchObject({
            kills: 1,
            deaths: 0,
            alive: true,
        });
        expect(players.find((p) => p.playerId === 1)).toMatchObject({
            kills: 0,
            deaths: 1,
            alive: false,
        });
        expect(
            players.find((p) => p.playerId === 1)!.respawnTicks
        ).toBeGreaterThan(0);

        const later = run(sim, RESPAWN_TICKS);
        expect(ofType(later, "TankSpawned").map((e) => e.playerId)).toEqual([
            1,
        ]);
        const back = tankOf(sim, 1)!;
        expect(back.id).not.toBe(victimId);
        expect(back.hp).toBe(ghost.stats.maxHp);
        expect(back.invulnerable).toBe(true);
        expect([back.x, back.y]).toEqual([enemy.x, enemy.y]);
    });

    it("chết không do người chơi bắn thì không ai được điểm", () => {
        const sim = readySim();
        sim.world.health.get(tankOf(sim, 1)!.id)!.hp = 0;
        run(sim, 1);
        expect(sim.getSnapshot().players.map((p) => p.kills)).toEqual([0, 0]);
    });

    it("hồi sinh ở điểm xuất phát đang trống của đội", () => {
        const rows = openRows(20, 9);
        rows[2] = rows[2]!.slice(0, 15) + "2" + rows[2]!.slice(16);
        rows[6] = rows[6]!.slice(0, 15) + "2" + rows[6]!.slice(16);
        const m = makeMap("respawn_pick", rows);
        const sim = makeSim(m, [
            { playerId: 0, team: 1, defId: "striker", x: 3, y: 4 },
            { playerId: 1, team: 2, defId: "ghost" },
        ]);
        const first = tankOf(sim, 1)!;
        expect([first.x, first.y]).toEqual([15.5, 2.5]);

        sim.world.health.get(first.id)!.hp = 0;
        run(sim, 1);
        // Xe đội 1 đứng chắn điểm xuất phát đầu tiên của đội 2
        const blocker = sim.world.transform.get(tankOf(sim, 0)!.id)!;
        blocker.x = 15.5;
        blocker.y = 2.5;
        run(sim, RESPAWN_TICKS, { aimX: 0, aimY: 0 });
        const back = tankOf(sim, 1)!;
        expect([back.x, back.y]).toEqual([15.5, 6.5]);
    });
});

describe("Chiến đấu xác định (deterministic)", () => {
    function randomInputs(seed: number, ticks: number): InputCmd[][] {
        const rng = new Rng(seed);
        const out: InputCmd[][] = [];
        for (let i = 0; i < ticks; i++) {
            out.push(
                [0, 1].map((playerId) =>
                    cmd({
                        tick: i,
                        playerId,
                        moveX: Math.round(rng.range(-1, 1)),
                        moveY: Math.round(rng.range(-1, 1)),
                        aimX: rng.range(0, 30),
                        aimY: rng.range(0, 12),
                        fire: rng.next() < 0.6,
                    })
                )
            );
        }
        return out;
    }

    const brickMap = mapWithColumn("det_brick", "B", 12);

    it("cùng seed + cùng input cho cùng snapshot và cùng sự kiện", () => {
        const inputs = randomInputs(9, 1500);
        const a = makeSim(brickMap, [shooter, { ...enemy, x: 20 }]);
        const b = makeSim(brickMap, [shooter, { ...enemy, x: 20 }]);
        const ea: GameEvent[] = [];
        const eb: GameEvent[] = [];
        for (const tickInputs of inputs) {
            a.step(tickInputs);
            b.step(tickInputs);
            ea.push(...a.drainEvents());
            eb.push(...b.drainEvents());
        }
        expect(ofType(ea, "ProjectileFired").length).toBeGreaterThan(10);
        expect(JSON.stringify(a.getSnapshot())).toBe(
            JSON.stringify(b.getSnapshot())
        );
        expect(JSON.stringify(ea)).toBe(JSON.stringify(eb));
    });

    it("seed khác thì độ tản đạn khác", () => {
        const inputs = randomInputs(9, 200);
        const a = makeSim(OPEN, [shooter], 1);
        const b = makeSim(OPEN, [shooter], 2);
        const angles = (sim: Simulation) => {
            const out: number[] = [];
            for (const tickInputs of inputs) {
                sim.step(tickInputs);
                for (const e of ofType(sim.drainEvents(), "ProjectileFired"))
                    out.push(e.angle);
            }
            return out;
        };
        expect(angles(a)).not.toEqual(angles(b));
    });
});

describe("Hình học va chạm của đạn", () => {
    it("đoạn thẳng dài đi xuyên hình tròn vẫn được phát hiện (không xuyên qua)", () => {
        // Đoạn dài 100 đi qua hình tròn bán kính 0.5 ở giữa: cả hai đầu mút đều nằm ngoài hình tròn
        const t = segmentCircleT(0, 0, 100, 0, 50, 0.2, 0.5);
        expect(t).not.toBeNull();
        expect(0 + 100 * t!).toBeCloseTo(50 - Math.sqrt(0.25 - 0.04), 9);
    });

    it("điểm đầu nằm trong hình tròn thì t = 0; đi ra xa hoặc lệch thì null", () => {
        expect(segmentCircleT(0, 0, 1, 0, 0, 0, 1)).toBe(0);
        expect(segmentCircleT(2, 0, 1, 0, 0, 0, 1)).toBeNull();
        expect(segmentCircleT(0, 5, 10, 0, 5, 0, 1)).toBeNull();
        expect(segmentCircleT(0, 0, 1, 0, 5, 0, 1)).toBeNull(); // chưa tới
    });

    const grid = TileMap.fromDef(
        makeMap("ray", [
            "##########",
            "#........#",
            "#....#...#",
            "#........#",
            "##########",
        ]),
        content.tiles
    );

    it("raycast lưới tìm đúng ô chặn đầu tiên và vị trí chạm", () => {
        const hit = raycastTiles(grid, 1.5, 2.5, 8.5, 2.5);
        expect(hit).toMatchObject({ col: 5, row: 2 });
        expect(1.5 + 7 * hit!.t).toBeCloseTo(5, 9);
    });

    it("raycast không chạm khi đoạn chưa tới tường; điểm đầu trong tường thì t = 0", () => {
        expect(raycastTiles(grid, 1.5, 1.5, 8.5, 1.5)).toBeNull();
        expect(raycastTiles(grid, 1.5, 2.5, 4.5, 2.5)).toBeNull();
        expect(raycastTiles(grid, 5.5, 2.5, 6.5, 2.5)).toMatchObject({
            t: 0,
            col: 5,
            row: 2,
        });
    });

    it("raycast đi chéo và đi ngược chiều", () => {
        expect(raycastTiles(grid, 8.5, 2.5, 1.5, 2.5)).toMatchObject({
            col: 5,
            row: 2,
        });
        expect(raycastTiles(grid, 3.5, 3.5, 6.5, 0.5)).not.toBeNull();
        expect(raycastTiles(grid, 1.5, 1.5, 1.5, -3)).toMatchObject({
            col: 1,
            row: 0,
        });
    });
});
