import type { PlayerSnapshot, ProjectileSnapshot, Snapshot, TankSnapshot } from "../shared/protocol";
import type { TileMap } from "./map/TileMap";
import type { World } from "./World";

/** Chụp trạng thái hiện tại thành dữ liệu thuần, chỉ đọc, an toàn để đưa cho Renderer hoặc gửi qua mạng. */
export function buildSnapshot(world: World, tick: number, map: TileMap, players: PlayerSnapshot[] = []): Snapshot {
  const tanks: TankSnapshot[] = [];
  const projectiles: ProjectileSnapshot[] = [];
  for (const id of world.entities) {
    const pos = world.transform.get(id);
    if (!pos) continue;

    const proj = world.projectile.get(id);
    if (proj) {
      projectiles.push({ id, defId: proj.defId, team: proj.team, x: pos.x, y: pos.y, angle: proj.angle, radius: proj.radius });
      continue;
    }

    const info = world.tankInfo.get(id);
    const hull = world.hull.get(id);
    const turret = world.turret.get(id);
    const mob = world.mobility.get(id);
    const ctrl = world.controller.get(id);
    const health = world.health.get(id);
    if (!info || !hull || !turret || !mob || !ctrl || !health) continue;
    const weapon = world.weapon.get(id);
    tanks.push({
      id,
      playerId: ctrl.playerId,
      team: info.team,
      defId: info.defId,
      x: pos.x,
      y: pos.y,
      hullAngle: hull.angle,
      turretAngle: turret.angle,
      radius: mob.radius,
      inBush: map.hidesUnitsAt(pos.x, pos.y),
      hp: health.hp,
      maxHp: health.maxHp,
      reload: weapon && weapon.cooldownTicks > 0 ? 1 - weapon.cooldownTicks / weapon.intervalTicks : 1,
      invulnerable: health.invulnTicks > 0,
    });
  }
  return { tick, tanks, projectiles, players };
}
