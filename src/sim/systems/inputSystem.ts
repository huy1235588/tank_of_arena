import type { InputCmd } from "../../shared/protocol";
import type { World } from "../World";

const finiteOr = (v: number, fallback: number): number => (Number.isFinite(v) ? v : fallback);

/**
 * Chép InputCmd vào Controller sau khi làm sạch (NaN, độ dài vector di chuyển > 1).
 * Dữ liệu từ mạng sau này không được tin tưởng, nên luôn làm sạch ở đây.
 * Người chơi không gửi input trong tick này: đứng yên, giữ nguyên điểm ngắm.
 */
export function inputSystem(world: World, inputs: ReadonlyMap<number, InputCmd>): void {
  for (const [, ctrl] of world.controller.entries()) {
    const cmd = inputs.get(ctrl.playerId);
    if (!cmd) {
      ctrl.moveX = 0;
      ctrl.moveY = 0;
      ctrl.fire = false;
      ctrl.skills = 0;
      continue;
    }

    let mx = finiteOr(cmd.moveX, 0);
    let my = finiteOr(cmd.moveY, 0);
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }

    ctrl.moveX = mx;
    ctrl.moveY = my;
    ctrl.aimX = finiteOr(cmd.aimX, ctrl.aimX);
    ctrl.aimY = finiteOr(cmd.aimY, ctrl.aimY);
    ctrl.fire = cmd.fire === true;
    ctrl.skills = finiteOr(cmd.skills, 0) | 0;
  }
}
