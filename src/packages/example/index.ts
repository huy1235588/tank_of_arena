import { computeEffectiveArmorRatio } from "./lib/impl";

export function previewMitigatedDamage(
  rawDamage: number,
  armor: number
): number {
  return rawDamage * computeEffectiveArmorRatio(armor);
}
