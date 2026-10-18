import { describe, expect, it } from "vitest";
import { TileMap } from "../src/sim/map/TileMap";
import { content, makeMap } from "./helpers";

const tiles = content.tiles;

describe("TileMap", () => {
  const map = TileMap.fromDef(makeMap("t", ["#####", "#1.g#", "#B.2#", "#####"]), tiles);

  it("đọc kích thước và loại tile", () => {
    expect(map.cols).toBe(5);
    expect(map.rows).toBe(4);
    expect(map.tileAt(0, 0)?.id).toBe("steel");
    expect(map.tileAt(3, 1)?.id).toBe("bush");
    expect(map.tileAt(1, 2)?.id).toBe("brick");
    expect(map.tileAt(2, 1)?.id).toBe("floor");
  });

  it("ô xuất phát là đất và được ghi lại theo đội (tâm ô)", () => {
    expect(map.tileAt(1, 1)?.id).toBe("floor");
    expect(map.spawnPoints(1)).toEqual([{ x: 1.5, y: 1.5 }]);
    expect(map.spawnPoints(2)).toEqual([{ x: 3.5, y: 2.5 }]);
    expect(map.spawnPoints(3)).toEqual([]);
  });

  it("tường chặn di chuyển và đạn; đất và bụi cỏ thì không", () => {
    expect(map.blocksMove(0, 0)).toBe(true);
    expect(map.blocksMove(1, 2)).toBe(true);
    expect(map.blocksMove(2, 1)).toBe(false);
    expect(map.blocksMove(3, 1)).toBe(false);
    expect(map.blocksProjectile(0, 0)).toBe(true);
    expect(map.blocksProjectile(3, 1)).toBe(false);
  });

  it("ngoài bản đồ được coi là tường đặc", () => {
    expect(map.blocksMove(-1, 0)).toBe(true);
    expect(map.blocksMove(0, -1)).toBe(true);
    expect(map.blocksMove(5, 0)).toBe(true);
    expect(map.blocksProjectile(0, 4)).toBe(true);
    expect(map.tileAt(-1, -1)).toBeNull();
  });

  it("bụi cỏ che xe theo tọa độ thế giới", () => {
    expect(map.hidesUnitsAt(3.5, 1.5)).toBe(true);
    expect(map.hidesUnitsAt(3.0, 1.0)).toBe(true); // mép trên trái của ô
    expect(map.hidesUnitsAt(2.99, 1.5)).toBe(false);
    expect(map.hidesUnitsAt(-5, -5)).toBe(false);
  });

  it("tường gạch mất máu dần rồi trở thành đất; thép và ô ngoài bản đồ không bị ảnh hưởng", () => {
    const m = TileMap.fromDef(makeMap("d", ["#####", "#1.g#", "#B.2#", "#####"]), tiles);
    const brickHp = tiles.find((t) => t.id === "brick")!.hp!;
    expect(m.tileHp(1, 2)).toBe(brickHp);
    for (let i = 1; i < brickHp; i++) {
      expect(m.damageTile(1, 2, 1)).toEqual({ hp: brickHp - i, maxHp: brickHp, destroyed: false });
    }
    expect(m.damageTile(1, 2, 1)).toEqual({ hp: 0, maxHp: brickHp, destroyed: true });
    expect(m.tileAt(1, 2)?.id).toBe("floor");
    expect(m.blocksMove(1, 2)).toBe(false);
    expect(m.damageTile(1, 2, 1)).toBeNull(); // giờ là đất

    expect(m.damageTile(0, 0, 99)).toBeNull();
    expect(m.tileAt(0, 0)?.id).toBe("steel");
    expect(m.damageTile(-1, 0, 1)).toBeNull();
    expect(() => m.setTile(1, 1, "ma")).toThrow(/ma/);
  });

  it("bản đồ arena_01 hợp lệ, đối xứng và đủ điểm xuất phát cho 3v3", () => {
    const arena = TileMap.fromDef(content.maps["arena_01"]!, tiles);
    expect(arena.cols).toBe(32);
    expect(arena.rows).toBe(20);
    expect(arena.spawnPoints(1).length).toBeGreaterThanOrEqual(3);
    expect(arena.spawnPoints(2).length).toBeGreaterThanOrEqual(3);

    // Đối xứng trái-phải: ô (c, r) giống ô (cols-1-c, r)
    for (let r = 0; r < arena.rows; r++) {
      for (let c = 0; c < arena.cols; c++) {
        expect(arena.tileAt(c, r)?.id).toBe(arena.tileAt(arena.cols - 1 - c, r)?.id);
      }
    }
  });

  it("mọi điểm xuất phát nối với nhau được (không bị tường nhốt)", () => {
    const arena = TileMap.fromDef(content.maps["arena_01"]!, tiles);
    const all = [...arena.spawnPoints(1), ...arena.spawnPoints(2)];
    const start = all[0]!;
    const seen = new Set<number>();
    const queue: [number, number][] = [[Math.floor(start.x), Math.floor(start.y)]];
    seen.add(queue[0]![1] * arena.cols + queue[0]![0]);
    while (queue.length) {
      const [c, r] = queue.shift()!;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nc = c + dc;
        const nr = r + dr;
        const key = nr * arena.cols + nc;
        if (seen.has(key) || arena.blocksMove(nc, nr)) continue;
        seen.add(key);
        queue.push([nc, nr]);
      }
    }
    for (const p of all) expect(seen.has(Math.floor(p.y) * arena.cols + Math.floor(p.x))).toBe(true);
  });
});
