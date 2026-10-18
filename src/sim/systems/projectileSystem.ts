import { type CombatContext, sweepProjectile } from "../combat/combat";

const dead: number[] = [];

/**
 * Di chuyển mọi viên đạn một tick theo kiểu quét (không xuyên tường/xe dù bay nhanh).
 * Đạn trúng thứ gì hoặc hết tầm bay thì bị xóa; việc xóa được dồn về cuối để không sửa World khi đang duyệt.
 */
export function projectileSystem(ctx: CombatContext, dt: number): void {
  const { world } = ctx;
  dead.length = 0;

  for (const [id, p] of world.projectile.entries()) {
    const pos = world.transform.get(id);
    if (!pos) {
      dead.push(id);
      continue;
    }

    const step = Math.min(p.speed * dt, p.remaining);
    if (!sweepProjectile(ctx, id, p, pos, pos.x + p.dirX * step, pos.y + p.dirY * step)) {
      dead.push(id);
      continue;
    }

    p.remaining -= step;
    if (p.remaining <= 1e-9) {
      ctx.events.push({ type: "ProjectileHit", id, kind: "expire", x: pos.x, y: pos.y });
      dead.push(id);
    }
  }

  for (const id of dead) world.destroyEntity(id);
}
