import type { TileMap } from "./TileMap";

export interface TileHit {
  /** Tỉ lệ trên đoạn (0..1) tại điểm chạm mép ô. */
  t: number;
  col: number;
  row: number;
}

/**
 * Tìm ô chặn đạn đầu tiên trên đoạn (x0, y0) -> (x1, y1), coi đạn là một điểm.
 * Duyệt lần lượt từng ô mà đoạn đi qua (thuật toán DDA của Amanatides & Woo), nên không bỏ sót ô nào
 * dù đoạn dài bao nhiêu. Nếu điểm đầu đã nằm trong ô chặn thì trả về t = 0 với chính ô đó.
 */
export function raycastTiles(map: TileMap, x0: number, y0: number, x1: number, y1: number): TileHit | null {
  let col = Math.floor(x0);
  let row = Math.floor(y0);
  if (map.blocksProjectile(col, row)) return { t: 0, col, row };

  const dx = x1 - x0;
  const dy = y1 - y0;
  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
  let tMaxX = stepX > 0 ? (col + 1 - x0) / dx : stepX < 0 ? (x0 - col) / -dx : Infinity;
  let tMaxY = stepY > 0 ? (row + 1 - y0) / dy : stepY < 0 ? (y0 - row) / -dy : Infinity;

  for (;;) {
    let t: number;
    if (tMaxX < tMaxY) {
      t = tMaxX;
      col += stepX;
      tMaxX += tDeltaX;
    } else {
      t = tMaxY;
      row += stepY;
      tMaxY += tDeltaY;
    }
    if (t > 1) return null;
    if (map.blocksProjectile(col, row)) return { t, col, row };
  }
}
