/**
 * Thời điểm t trong [0, 1] mà đoạn P(t) = (x0, y0) + t * (dx, dy) chạm hình tròn tâm (cx, cy) bán kính r lần đầu.
 * Trả về 0 nếu điểm đầu đã nằm trong hình tròn, null nếu không chạm trong đoạn.
 */
export function segmentCircleT(
    x0: number,
    y0: number,
    dx: number,
    dy: number,
    cx: number,
    cy: number,
    r: number
): number | null {
    const fx = x0 - cx;
    const fy = y0 - cy;
    const c = fx * fx + fy * fy - r * r;
    if (c <= 0) return 0;

    const a = dx * dx + dy * dy;
    if (a < 1e-12) return null;
    const b = 2 * (fx * dx + fy * dy);
    if (b >= 0) return null; // đang đi ra xa tâm

    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t <= 1 ? t : null;
}
