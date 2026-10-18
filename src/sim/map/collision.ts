import type { TileMap } from "./TileMap";

/** Khoảng đệm nhỏ để sau khi đẩy ra, xe không còn "chạm đúng mép" do sai số số học. */
const SKIN = 1e-7;
const MAX_ITERATIONS = 4;

/**
 * Đẩy một hình tròn (tâm pos, bán kính r) ra khỏi mọi ô chặn di chuyển (hình vuông AABB).
 *
 * Với mỗi ô chặn, lấy điểm gần nhất của ô tới tâm; nếu cách tâm < r thì đẩy tâm ra
 * theo pháp tuyến. Cách này khiến xe trượt dọc tường (thành phần tiếp tuyến được giữ nguyên)
 * và lượn quanh góc mượt thay vì dính vào.
 *
 * Giả định mỗi tick xe đi được quãng ngắn hơn r (đúng với tốc độ hiện tại: 0,125 so với 0,45).
 * Kỹ năng lướt (Dash) ở M4 phải chia nhỏ thành nhiều bước con để giữ giả định này.
 */
export function resolveCircleTiles(
    map: TileMap,
    pos: { x: number; y: number },
    r: number
): void {
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        let pushed = false;
        const c0 = Math.floor(pos.x - r);
        const c1 = Math.floor(pos.x + r);
        const r0 = Math.floor(pos.y - r);
        const r1 = Math.floor(pos.y + r);

        for (let row = r0; row <= r1; row++) {
            for (let col = c0; col <= c1; col++) {
                if (!map.blocksMove(col, row)) continue;

                const nearestX = Math.min(Math.max(pos.x, col), col + 1);
                const nearestY = Math.min(Math.max(pos.y, row), row + 1);
                const dx = pos.x - nearestX;
                const dy = pos.y - nearestY;
                const d2 = dx * dx + dy * dy;
                if (d2 >= r * r) continue;

                if (d2 > 1e-12) {
                    const d = Math.sqrt(d2);
                    const push = r - d + SKIN;
                    pos.x += (dx / d) * push;
                    pos.y += (dy / d) * push;
                } else {
                    // Tâm nằm trong (hoặc đúng mép) ô: đẩy ra qua mặt gần nhất
                    const toLeft = pos.x - col;
                    const toRight = col + 1 - pos.x;
                    const toTop = pos.y - row;
                    const toBottom = row + 1 - pos.y;
                    const m = Math.min(toLeft, toRight, toTop, toBottom);
                    if (m === toLeft) pos.x = col - r - SKIN;
                    else if (m === toRight) pos.x = col + 1 + r + SKIN;
                    else if (m === toTop) pos.y = row - r - SKIN;
                    else pos.y = row + 1 + r + SKIN;
                }
                pushed = true;
            }
        }
        if (!pushed) break;
    }
}
