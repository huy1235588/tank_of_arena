/** Nhân các kênh màu với f (f < 1: tối hơn, f > 1: sáng hơn). */
export function shade(color: number, f: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((color & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

/** "#rrggbb" -> 0xrrggbb; dùng màu dự phòng nếu thiếu. */
export function parseColor(css: string | undefined, fallback: number): number {
  return css ? parseInt(css.slice(1), 16) : fallback;
}
