import { resolveCircleTiles } from "../map/collision";
import type { TileMap } from "../map/TileMap";
import type { SpatialHash } from "../spatial/SpatialHash";
import type { World } from "../World";

const PASSES = 3;
const scratch: number[] = [];

/**
 * Xử lý va chạm sau khi di chuyển: Xe - Xe (đẩy hai vòng tròn ra xa nhau), rồi Xe - Tường.
 * Lặp vài lượt vì đẩy xe ra khỏi xe khác có thể làm nó lấn vào tường và ngược lại; tường luôn thắng ở lượt cuối.
 */
export function collisionSystem(
    world: World,
    map: TileMap,
    hash: SpatialHash
): void {
    hash.clear();
    for (const id of world.entities) {
        const p = world.transform.get(id);
        if (p && world.mobility.has(id)) hash.insert(id, p.x, p.y);
    }

    for (let pass = 0; pass < PASSES; pass++) {
        for (const a of world.entities) {
            const pa = world.transform.get(a);
            const ma = world.mobility.get(a);
            if (!pa || !ma) continue;

            scratch.length = 0;
            hash.query(pa.x, pa.y, ma.radius, scratch);
            for (let i = 0; i < scratch.length; i++) {
                const b = scratch[i]!;
                if (b <= a) continue; // mỗi cặp chỉ xử lý một lần
                const pb = world.transform.get(b);
                const mb = world.mobility.get(b);
                if (!pb || !mb) continue;

                const dx = pb.x - pa.x;
                const dy = pb.y - pa.y;
                const dist = Math.hypot(dx, dy);
                const minDist = ma.radius + mb.radius;
                if (dist >= minDist) continue;

                // Trùng tâm hoàn toàn: đẩy theo trục x (cố định, để kết quả xác định)
                const nx = dist > 1e-9 ? dx / dist : 1;
                const ny = dist > 1e-9 ? dy / dist : 0;
                const half = (minDist - dist) / 2;
                pa.x -= nx * half;
                pa.y -= ny * half;
                pb.x += nx * half;
                pb.y += ny * half;
            }
        }

        for (const id of world.entities) {
            const p = world.transform.get(id);
            const m = world.mobility.get(id);
            if (p && m) resolveCircleTiles(map, p, m.radius);
        }
    }
}
