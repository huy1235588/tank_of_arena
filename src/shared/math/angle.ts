/**
 * Toán góc dùng chung. Quy ước: radian, hệ tọa độ y hướng xuống (như màn hình),
 * góc 0 = hướng +x, góc dương = quay theo chiều kim đồng hồ trên màn hình.
 */

export const TAU = Math.PI * 2;

/** Chuẩn hóa góc về khoảng [-π, π]. */
export const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Hiệu góc ngắn nhất từ a tới b, trong [-π, π]. */
export const angleDiff = (a: number, b: number): number => wrap(b - a);

/** Xoay a về phía b theo đường ngắn nhất, không quá maxStep (radian). */
export const turnToward = (a: number, b: number, maxStep: number): number => {
  const d = angleDiff(a, b);
  const step = Math.max(-maxStep, Math.min(maxStep, d));
  return wrap(a + step);
};
