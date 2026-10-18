import { wrap } from "../../shared/math/angle";
import type { Rng } from "../../shared/rng";
import type { ProjectileDef } from "../../shared/schema/types";
import { type CombatContext, sweepProjectile } from "../combat/combat";

/**
 * Bắn khi giữ nút bắn và đã nạp xong. Giữ nút = bắn liên tục theo nhịp intervalTicks.
 *
 * Đạn được tạo tại TÂM xe rồi quét tới đầu nòng ngay trong tick này. Nhờ vậy khi xe áp sát tường,
 * đạn trúng tường ngay chứ không xuất hiện ở phía bên kia (đầu nòng có thể nằm trong tường).
 * Hướng bay = góc tháp pháo + độ lệch ngẫu nhiên từ Rng có seed (giữ xác định).
 * Bắn sẽ kết thúc thời gian được bảo vệ khi vừa xuất hiện.
 */
export function weaponSystem(ctx: CombatContext, rng: Rng, defs: Readonly<Record<string, ProjectileDef>>): void {
  const { world } = ctx;
  for (const [id, w] of world.weapon.entries()) {
    if (w.cooldownTicks > 0) w.cooldownTicks--;

    const ctrl = world.controller.get(id);
    if (!ctrl || !ctrl.fire || w.cooldownTicks > 0) continue;
    const pos = world.transform.get(id);
    const turret = world.turret.get(id);
    const info = world.tankInfo.get(id);
    const def = defs[w.projectileId];
    if (!pos || !turret || !info || !def) continue;

    w.cooldownTicks = w.intervalTicks;
    const health = world.health.get(id);
    if (health) health.invulnTicks = 0;

    const cos = Math.cos(turret.angle);
    const sin = Math.sin(turret.angle);
    const muzzleX = pos.x + cos * w.muzzleX - sin * w.muzzleY;
    const muzzleY = pos.y + sin * w.muzzleX + cos * w.muzzleY;
    const angle = wrap(turret.angle + (w.spread > 0 ? rng.range(-w.spread, w.spread) : 0));

    const pid = world.createEntity();
    const ppos = { x: pos.x, y: pos.y };
    const proj = {
      defId: def.id,
      ownerId: id,
      ownerPlayerId: ctrl.playerId,
      team: info.team,
      angle,
      dirX: Math.cos(angle),
      dirY: Math.sin(angle),
      speed: def.speed,
      damage: def.damage,
      wallDamage: def.wallDamage ?? 1,
      radius: def.radius,
      remaining: def.range,
    };
    world.transform.set(pid, ppos);
    world.projectile.set(pid, proj);
    ctx.events.push({
      type: "ProjectileFired",
      id: pid,
      ownerId: id,
      playerId: ctrl.playerId,
      x: muzzleX,
      y: muzzleY,
      angle,
    });

    if (!sweepProjectile(ctx, pid, proj, ppos, muzzleX, muzzleY)) world.destroyEntity(pid);
  }
}
