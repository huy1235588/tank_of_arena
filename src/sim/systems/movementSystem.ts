import { angleDiff, turnToward } from "../../shared/math/angle";
import type { World } from "../World";

/** Tốc độ tối thiểu (tỉ lệ) khi thân xe đang quay ngược hướng cần đi. */
const MIN_TURNING_SPEED = 0.4;

/**
 * Thân xe đi theo hướng input (đa hướng) và xoay dần về hướng đó.
 * Khi thân chưa quay đúng hướng thì chạy chậm hơn để có cảm giác "xe nặng".
 * Chỉ cộng dồn vị trí; đẩy ra khỏi tường và xe khác là việc của collisionSystem.
 */
export function movementSystem(world: World, dt: number): void {
    for (const [id, ctrl] of world.controller.entries()) {
        const pos = world.transform.get(id);
        const hull = world.hull.get(id);
        const mob = world.mobility.get(id);
        if (!pos || !hull || !mob) continue;

        const len = Math.hypot(ctrl.moveX, ctrl.moveY); // đã <= 1 nhờ inputSystem
        if (len < 1e-6) continue;

        const want = Math.atan2(ctrl.moveY, ctrl.moveX);
        hull.angle = turnToward(hull.angle, want, hull.turnRate * dt);

        const align = Math.max(0, Math.cos(angleDiff(hull.angle, want)));
        const speed =
            mob.moveSpeed *
            len *
            (MIN_TURNING_SPEED + (1 - MIN_TURNING_SPEED) * align);
        pos.x += Math.cos(want) * speed * dt;
        pos.y += Math.sin(want) * speed * dt;
    }
}
