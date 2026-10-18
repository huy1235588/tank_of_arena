import { SPAWN_PROTECTION_TICKS, TICK_RATE } from "../../shared/constants";
import type { TankDef } from "../../shared/schema/types";
import type { EntityId, World } from "../World";

/** Tạo entity xe tăng từ TankDef: đọc dữ liệu rồi gắn component, không có logic riêng cho từng loại xe. */
export function spawnTank(
    world: World,
    def: TankDef,
    playerId: number,
    team: number,
    x: number,
    y: number,
    angle = 0
): EntityId {
    const id = world.createEntity();
    world.transform.set(id, { x, y });
    world.hull.set(id, { angle, turnRate: def.stats.hullTurnRate });
    world.turret.set(id, { angle, turnRate: def.stats.turretTurnRate });
    world.mobility.set(id, {
        moveSpeed: def.stats.moveSpeed,
        radius: def.stats.radius,
    });
    world.controller.set(id, {
        playerId,
        moveX: 0,
        moveY: 0,
        aimX: x + Math.cos(angle),
        aimY: y + Math.sin(angle),
        fire: false,
        skills: 0,
    });
    world.tankInfo.set(id, { defId: def.id, team });
    world.health.set(id, {
        hp: def.stats.maxHp,
        maxHp: def.stats.maxHp,
        armor: def.stats.armor,
        invulnTicks: SPAWN_PROTECTION_TICKS,
        lastHitBy: -1,
    });
    world.weapon.set(id, {
        projectileId: def.weapon.projectile,
        intervalTicks: Math.max(
            1,
            Math.round(def.weapon.fireInterval * TICK_RATE)
        ),
        cooldownTicks: 0,
        muzzleX: def.weapon.muzzleOffset[0],
        muzzleY: def.weapon.muzzleOffset[1],
        spread: ((def.weapon.spreadDeg ?? 0) * Math.PI) / 180,
    });
    return id;
}
