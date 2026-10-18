export function computeEffectiveArmorRatio(armor: number): number {
  const clamped = Math.max(0, armor);
  return 100 / (100 + clamped);
}
