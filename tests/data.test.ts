import { describe, expect, it } from "vitest";
import { loadContent, loadMaps, loadProjectileDefs, loadTankDefs, loadTiles } from "../data";
import {
  validateContentRefs,
  validateMapDef,
  validateProjectileDef,
  validateTankDef,
  validateTileDefs,
} from "../src/shared/schema/validate";

const valid = {
  id: "t1",
  name: "T1",
  role: "tank",
  stats: { maxHp: 100, armor: 0, moveSpeed: 5, hullTurnRate: 6, turretTurnRate: 10, radius: 0.5 },
  weapon: { projectile: "p", fireInterval: 0.5, muzzleOffset: [0.8, 0] },
  skills: [],
  sprite: { hull: "h", turret: "t" },
};

describe("dữ liệu xe tăng", () => {
  it("nạp tự động mọi file trong data/tanks", () => {
    const defs = loadTankDefs();
    expect(Object.keys(defs).sort()).toEqual(["ghost", "striker"]);
    expect(defs.ghost!.stats.moveSpeed).toBeGreaterThan(defs.striker!.stats.moveSpeed);
  });

  it("chấp nhận dữ liệu hợp lệ", () => {
    expect(validateTankDef(valid).id).toBe("t1");
  });

  it("báo lỗi rõ ràng khi dữ liệu sai", () => {
    expect(() => validateTankDef({ ...valid, stats: { ...valid.stats, moveSpeed: -1 } }, "x.json")).toThrow(/x\.json\.stats.*moveSpeed/);
    expect(() => validateTankDef({ ...valid, role: "wizard" }, "x.json")).toThrow(/role/);
    expect(() => validateTankDef({ ...valid, skills: ["a", "b", "c", "d"] }, "x.json")).toThrow(/skills/);
    expect(() => validateTankDef(null, "x.json")).toThrow(/x\.json/);
  });

  it("phát hiện id trùng", () => {
    expect(() => loadTankDefs({ "./tanks/a.json": valid, "./tanks/b.json": valid })).toThrow(/trùng/);
  });
});

const floor = { id: "floor", glyph: ".", blocksMove: false, blocksProjectile: false };
const wall = { id: "wall", glyph: "#", blocksMove: true, blocksProjectile: true };

describe("dữ liệu địa hình", () => {
  it("nạp tiles.json và có đủ bốn loại cơ bản", () => {
    const tiles = loadTiles();
    expect(tiles.map((t) => t.id).sort()).toEqual(["brick", "bush", "floor", "steel"]);
    expect(tiles.find((t) => t.id === "brick")?.hp).toBeGreaterThan(0);
    expect(tiles.find((t) => t.id === "bush")?.hidesUnits).toBe(true);
  });

  it("nạp tự động mọi bản đồ và kiểm tra chéo với tiles", () => {
    const c = loadContent();
    expect(Object.keys(c.maps)).toContain("arena_01");
  });

  it("báo lỗi khi tile sai", () => {
    expect(() => validateTileDefs([wall], "t")).toThrow(/floor/);
    expect(() => validateTileDefs([floor, floor], "t")).toThrow(/trùng/);
    expect(() => validateTileDefs([floor, { ...wall, glyph: "5" }], "t")).toThrow(/glyph/);
    expect(() => validateTileDefs([floor, { ...wall, glyph: "##" }], "t")).toThrow(/glyph/);
    expect(() => validateTileDefs([floor, { ...wall, id: "w2", glyph: "." }], "t")).toThrow(/trùng/);
    expect(() => validateTileDefs([floor, { ...wall, becomesOnDestroy: "ma" }], "t")).toThrow(/becomesOnDestroy/);
    expect(() => validateTileDefs([floor, { ...wall, color: "red" }], "t")).toThrow(/color/);
    expect(() => validateTileDefs([floor, { ...wall, blocksMove: "yes" }], "t")).toThrow(/blocksMove/);
    expect(() => validateTileDefs([], "t")).toThrow();
  });

  it("báo lỗi khi bản đồ sai", () => {
    const tiles = loadTiles();
    const ok = { id: "m", name: "M", rows: ["###", "#1#", "###"] };
    expect(validateMapDef(ok, tiles, "m.json").rows).toHaveLength(3);
    expect(() => validateMapDef({ ...ok, rows: ["###", "#1", "###"] }, tiles, "m.json")).toThrow(/hàng 1/);
    expect(() => validateMapDef({ ...ok, rows: ["###", "#?#", "###"] }, tiles, "m.json")).toThrow(/"\?".*hàng 1, cột 1/);
    expect(() => validateMapDef({ ...ok, rows: ["###", "###"] }, tiles, "m.json")).toThrow(/rows/);
  });

  it("phát hiện id bản đồ trùng", () => {
    const tiles = loadTiles();
    const m = { id: "m", name: "M", rows: ["###", "#1#", "###"] };
    expect(() => loadMaps(tiles, { "./maps/a.json": m, "./maps/b.json": m })).toThrow(/trùng/);
  });

  it("bán kính xe lớn hơn 1 bị từ chối (giới hạn của SpatialHash)", () => {
    expect(() => validateTankDef({ ...valid, stats: { ...valid.stats, radius: 1.5 } }, "x.json")).toThrow(/radius/);
  });
});

const bullet = { id: "b", speed: 10, damage: 20, range: 8, radius: 0.1 };

describe("dữ liệu đạn", () => {
  it("nạp tự động mọi file trong data/projectiles và mọi xe trỏ tới đạn có thật", () => {
    const c = loadContent();
    expect(Object.keys(c.projectiles).sort()).toEqual(["bullet_basic", "bullet_fast"]);
    for (const tank of Object.values(c.tanks)) expect(c.projectiles[tank.weapon.projectile]).toBeDefined();
  });

  it("chấp nhận dữ liệu hợp lệ, wallDamage và color là tùy chọn", () => {
    expect(validateProjectileDef(bullet)).toEqual(bullet);
    expect(validateProjectileDef({ ...bullet, wallDamage: 2, color: "#ffffff" }).wallDamage).toBe(2);
  });

  it("báo lỗi rõ ràng khi dữ liệu sai", () => {
    expect(() => validateProjectileDef({ ...bullet, speed: 0 }, "p.json")).toThrow(/p\.json.*speed/);
    expect(() => validateProjectileDef({ ...bullet, damage: -1 }, "p.json")).toThrow(/damage/);
    expect(() => validateProjectileDef({ ...bullet, radius: 0.8 }, "p.json")).toThrow(/radius/);
    expect(() => validateProjectileDef({ ...bullet, color: "blue" }, "p.json")).toThrow(/color/);
    expect(() => validateProjectileDef("x", "p.json")).toThrow(/p\.json/);
  });

  it("phát hiện id trùng", () => {
    expect(() => loadProjectileDefs({ "./projectiles/a.json": bullet, "./projectiles/b.json": bullet })).toThrow(/trùng/);
  });

  it("xe trỏ tới loại đạn không tồn tại thì báo lỗi nêu rõ xe và đạn", () => {
    const c = loadContent();
    const bad = { ...c, tanks: { t1: validateTankDef({ ...valid, weapon: { ...valid.weapon, projectile: "ma" } }) } };
    expect(() => validateContentRefs(bad)).toThrow(/t1.*"ma"/);
  });

  it("spreadDeg tùy chọn, phải trong khoảng 0..45", () => {
    expect(validateTankDef({ ...valid, weapon: { ...valid.weapon, spreadDeg: 3 } }).weapon.spreadDeg).toBe(3);
    expect(validateTankDef(valid).weapon.spreadDeg).toBeUndefined();
    expect(() => validateTankDef({ ...valid, weapon: { ...valid.weapon, spreadDeg: 90 } }, "x.json")).toThrow(/spreadDeg/);
  });
});
