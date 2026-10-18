import type { GameEvent } from "../../shared/protocol";
import { segmentCircleT } from "../../shared/math/segment";
import type { Projectile, Transform } from "../components";
import { raycastTiles } from "../map/raycast";
import type { TileMap } from "../map/TileMap";
import type { EntityId, World } from "../World";

/** Những gì các hệ thống chiến đấu cần: trạng thái, bản đồ và nơi ghi sự kiện. */
export interface CombatContext {
  readonly world: World;
  readonly map: TileMap;
  readonly events: GameEvent[];
}

/** Sát thương sau giáp: dmg * 100 / (100 + armor). */
export function mitigate(damage: number, armor: number): number {
  return (damage * 100) / (100 + armor);
}

/**
 * Gây sát thương lên xe. Bỏ qua xe đã hết máu hoặc đang được bảo vệ khi vừa xuất hiện.
 * Không xóa xe ở đây: việc hạ xe, tính điểm và hồi sinh do Simulation xử lý cuối tick.
 * Trả về lượng máu thực sự bị trừ.
 */
export function applyDamage(ctx: CombatContext, targetId: EntityId, damage: number, byPlayerId: number): number {
  const h = ctx.world.health.get(targetId);
  if (!h || h.hp <= 0 || h.invulnTicks > 0) return 0;

  const amount = Math.min(h.hp, mitigate(damage, h.armor));
  h.hp -= amount;
  if (h.hp < 1e-9) h.hp = 0;
  h.lastHitBy = byPlayerId;

  const pos = ctx.world.transform.get(targetId);
  ctx.events.push({
    type: "TankDamaged",
    id: targetId,
    playerId: ctx.world.controller.get(targetId)?.playerId ?? -1,
    byPlayerId,
    amount,
    hp: h.hp,
    x: pos?.x ?? 0,
    y: pos?.y ?? 0,
  });
  return amount;
}

/** Đạn chạm ô (col, row): tường phá được bị trừ máu, có thể vỡ thành tile khác. */
function hitTile(ctx: CombatContext, col: number, row: number, wallDamage: number): void {
  const result = ctx.map.damageTile(col, row, wallDamage);
  if (!result) return;
  ctx.events.push({ type: "TileDamaged", col, row, hp: result.hp, maxHp: result.maxHp });
  if (result.destroyed) {
    ctx.events.push({ type: "TileChanged", col, row, tileId: ctx.map.tileAt(col, row)!.id });
  }
}

/**
 * Di chuyển đạn theo đoạn thẳng từ vị trí hiện tại tới (toX, toY), dừng ở va chạm sớm nhất.
 * - Tường: coi đạn là một điểm (raycast lưới).
 * - Xe: hình tròn bán kính (xe + đạn). Bỏ qua xe đã bắn, đồng đội và xe đã hết máu.
 * Nếu tường và xe cùng khoảng cách thì tường thắng (đạn không bắn xuyên góc tường).
 * Trả về false nếu đạn đã trúng thứ gì đó (người gọi phải xóa entity đạn).
 */
export function sweepProjectile(
  ctx: CombatContext,
  id: EntityId,
  proj: Projectile,
  pos: Transform,
  toX: number,
  toY: number,
): boolean {
  const { world } = ctx;
  const dx = toX - pos.x;
  const dy = toY - pos.y;

  let tankT = Infinity;
  let target = -1;
  for (const [tid, info] of world.tankInfo.entries()) {
    if (tid === proj.ownerId || info.team === proj.team) continue;
    const h = world.health.get(tid);
    const tp = world.transform.get(tid);
    const mob = world.mobility.get(tid);
    if (!h || h.hp <= 0 || !tp || !mob) continue;
    const t = segmentCircleT(pos.x, pos.y, dx, dy, tp.x, tp.y, mob.radius + proj.radius);
    if (t !== null && t < tankT) {
      tankT = t;
      target = tid;
    }
  }

  const wall = raycastTiles(ctx.map, pos.x, pos.y, toX, toY);
  if (wall && wall.t <= tankT) {
    pos.x += dx * wall.t;
    pos.y += dy * wall.t;
    ctx.events.push({ type: "ProjectileHit", id, kind: "wall", x: pos.x, y: pos.y });
    hitTile(ctx, wall.col, wall.row, proj.wallDamage);
    return false;
  }

  if (target >= 0) {
    pos.x += dx * tankT;
    pos.y += dy * tankT;
    ctx.events.push({ type: "ProjectileHit", id, kind: "tank", x: pos.x, y: pos.y, targetId: target });
    applyDamage(ctx, target, proj.damage, proj.ownerPlayerId);
    return false;
  }

  pos.x = toX;
  pos.y = toY;
  return true;
}
