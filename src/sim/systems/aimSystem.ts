import { turnToward } from "../../shared/math/angle";
import type { World } from "../World";

/** Tháp pháo xoay độc lập với thân xe, luôn hướng về điểm ngắm (tọa độ thế giới). */
export function aimSystem(world: World, dt: number): void {
  for (const [id, ctrl] of world.controller.entries()) {
    const turret = world.turret.get(id);
    const pos = world.transform.get(id);
    if (!turret || !pos) continue;

    const dx = ctrl.aimX - pos.x;
    const dy = ctrl.aimY - pos.y;
    if (dx * dx + dy * dy < 1e-6) continue; // con trỏ nằm ngay tâm xe: giữ nguyên góc

    turret.angle = turnToward(turret.angle, Math.atan2(dy, dx), turret.turnRate * dt);
  }
}
