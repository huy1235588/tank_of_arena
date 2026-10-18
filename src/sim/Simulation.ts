import { RESPAWN_TICKS, STEP } from "../shared/constants";
import type { GameEvent, InputCmd, PlayerSnapshot, Snapshot } from "../shared/protocol";
import { Rng } from "../shared/rng";
import type { GameContent, ProjectileDef, TankDef } from "../shared/schema/types";
import type { CombatContext } from "./combat/combat";
import { spawnTank } from "./entities/spawnTank";
import { TileMap } from "./map/TileMap";
import { buildSnapshot } from "./snapshot";
import { SpatialHash } from "./spatial/SpatialHash";
import { aimSystem } from "./systems/aimSystem";
import { collisionSystem } from "./systems/collisionSystem";
import { inputSystem } from "./systems/inputSystem";
import { movementSystem } from "./systems/movementSystem";
import { projectileSystem } from "./systems/projectileSystem";
import { weaponSystem } from "./systems/weaponSystem";
import type { EntityId } from "./World";
import { World } from "./World";

export interface PlayerConfig {
  playerId: number;
  team: number;
  defId: string;
  /** Vị trí xuất phát tùy chọn (cả khi hồi sinh). Mặc định: điểm xuất phát của đội trên bản đồ. */
  x?: number;
  y?: number;
}

export interface SimConfig {
  seed: number;
  mapId: string;
  players: PlayerConfig[];
}

/** Trạng thái của một người chơi qua nhiều lần chết/hồi sinh (xe là entity, người chơi thì không). */
interface PlayerState {
  readonly config: PlayerConfig;
  readonly def: TankDef;
  /** Thứ tự của người này trong đội, dùng để chọn điểm xuất phát mặc định. */
  readonly slot: number;
  entityId: EntityId | null;
  kills: number;
  deaths: number;
  /** Số tick còn lại trước khi hồi sinh (chỉ có nghĩa khi entityId = null). */
  respawnTicks: number;
}

/**
 * Lõi mô phỏng. Quy tắc: file này và mọi thứ trong sim/ không được dùng DOM, PixiJS,
 * thời gian thực hay số ngẫu nhiên không seed. Cùng input -> cùng kết quả.
 */
export class Simulation {
  readonly world = new World();
  readonly rng: Rng;
  readonly map: TileMap;
  tick = 0;

  private readonly hash = new SpatialHash(2);
  private readonly projectileDefs: Readonly<Record<string, ProjectileDef>>;
  private readonly players = new Map<number, PlayerState>();
  private readonly combat: CombatContext;
  private snapshot: Snapshot;
  private events: GameEvent[] = [];

  constructor(config: SimConfig, content: GameContent) {
    this.rng = new Rng(config.seed);
    this.projectileDefs = content.projectiles;

    const mapDef = content.maps[config.mapId];
    if (!mapDef) throw new Error(`Simulation: không có bản đồ "${config.mapId}"`);
    this.map = TileMap.fromDef(mapDef, content.tiles);
    this.combat = { world: this.world, map: this.map, events: this.events };

    const slots = new Map<number, number>();
    for (const player of config.players) {
      const def = content.tanks[player.defId];
      if (!def) throw new Error(`Simulation: không có TankDef "${player.defId}"`);
      if (!content.projectiles[def.weapon.projectile]) {
        throw new Error(`Simulation: TankDef "${def.id}" dùng loại đạn không tồn tại "${def.weapon.projectile}"`);
      }
      if (this.players.has(player.playerId)) throw new Error(`Simulation: playerId ${player.playerId} bị trùng`);
      if ((player.x === undefined || player.y === undefined) && this.map.spawnPoints(player.team).length === 0) {
        throw new Error(`Simulation: bản đồ "${config.mapId}" không có điểm xuất phát cho đội ${player.team}`);
      }

      const slot = slots.get(player.team) ?? 0;
      slots.set(player.team, slot + 1);
      const state: PlayerState = { config: player, def, slot, entityId: null, kills: 0, deaths: 0, respawnTicks: 0 };
      this.players.set(player.playerId, state);
      this.spawnPlayer(state, false);
    }
    this.snapshot = buildSnapshot(this.world, this.tick, this.map, this.playerSnapshots());
  }

  /** Chạy đúng một tick (dt = STEP). Nếu một người chơi có nhiều InputCmd, lệnh cuối cùng thắng. */
  step(inputs: readonly InputCmd[]): void {
    const byPlayer = new Map<number, InputCmd>();
    for (const cmd of inputs) byPlayer.set(cmd.playerId, cmd);

    // Thứ tự cố định: Input -> Aim -> Movement -> Collision -> Weapon -> Projectile -> Hạ xe/Hồi sinh.
    // (Sau này thêm AI trước Input và Skill sau Collision.)
    inputSystem(this.world, byPlayer);
    aimSystem(this.world, STEP);
    movementSystem(this.world, STEP);
    collisionSystem(this.world, this.map, this.hash);
    this.tickProtection();
    weaponSystem(this.combat, this.rng, this.projectileDefs);
    projectileSystem(this.combat, STEP);
    this.resolveDeathsAndRespawns();

    this.tick++;
    this.snapshot = buildSnapshot(this.world, this.tick, this.map, this.playerSnapshots());
  }

  /** Snapshot của tick hiện tại; chỉ đọc, được tạo một lần mỗi tick. */
  getSnapshot(): Snapshot {
    return this.snapshot;
  }

  /** Lấy và xóa các sự kiện phát sinh từ lần gọi trước. */
  drainEvents(): GameEvent[] {
    // Giữ nguyên mảng (CombatContext đang trỏ tới nó), chỉ lấy nội dung ra.
    return this.events.splice(0, this.events.length);
  }

  private tickProtection(): void {
    for (const [, h] of this.world.health.entries()) if (h.invulnTicks > 0) h.invulnTicks--;
  }

  /** Xe hết máu bị xóa, tính điểm cho người bắn phát cuối; người chết đếm ngược rồi hồi sinh. */
  private resolveDeathsAndRespawns(): void {
    for (const p of this.players.values()) {
      if (p.entityId === null) {
        if (--p.respawnTicks <= 0) this.spawnPlayer(p, true);
        continue;
      }

      const h = this.world.health.get(p.entityId);
      if (!h || h.hp > 0) continue;

      const killer = this.players.get(h.lastHitBy);
      if (killer && killer !== p) killer.kills++;
      p.deaths++;

      const pos = this.world.transform.get(p.entityId)!;
      this.events.push({
        type: "TankDestroyed",
        id: p.entityId,
        playerId: p.config.playerId,
        byPlayerId: h.lastHitBy,
        x: pos.x,
        y: pos.y,
      });
      this.world.destroyEntity(p.entityId);
      p.entityId = null;
      p.respawnTicks = RESPAWN_TICKS;
    }
  }

  private spawnPlayer(p: PlayerState, respawn: boolean): void {
    const { config } = p;
    let x: number;
    let y: number;
    let angle = 0;
    if (config.x !== undefined && config.y !== undefined) {
      x = config.x;
      y = config.y;
    } else {
      const point = this.pickSpawnPoint(p, respawn);
      x = point.x;
      y = point.y;
      angle = Math.atan2(this.map.rows / 2 - y, this.map.cols / 2 - x); // quay mặt vào giữa bản đồ
    }

    const id = spawnTank(this.world, p.def, config.playerId, config.team, x, y, angle);
    p.entityId = id;
    p.respawnTicks = 0;
    this.events.push({ type: "TankSpawned", id, playerId: config.playerId });
  }

  /**
   * Lúc đầu trận: điểm theo thứ tự trong đội. Khi hồi sinh: điểm đầu tiên (bắt đầu từ điểm của mình)
   * không có xe nào đứng gần, để không xuất hiện chồng lên xe khác. Nếu mọi điểm đều có xe thì dùng điểm của mình.
   */
  private pickSpawnPoint(p: PlayerState, respawn: boolean): { x: number; y: number } {
    const points = this.map.spawnPoints(p.config.team);
    const own = points[p.slot % points.length]!;
    if (!respawn) return own;

    for (let i = 0; i < points.length; i++) {
      const point = points[(p.slot + i) % points.length]!;
      let free = true;
      for (const [id, pos] of this.world.transform.entries()) {
        const mob = this.world.mobility.get(id);
        if (mob && Math.hypot(pos.x - point.x, pos.y - point.y) < mob.radius + p.def.stats.radius) {
          free = false;
          break;
        }
      }
      if (free) return point;
    }
    return own;
  }

  private playerSnapshots(): PlayerSnapshot[] {
    const out: PlayerSnapshot[] = [];
    for (const p of this.players.values()) {
      out.push({
        playerId: p.config.playerId,
        team: p.config.team,
        kills: p.kills,
        deaths: p.deaths,
        alive: p.entityId !== null,
        respawnTicks: p.entityId === null ? p.respawnTicks : 0,
      });
    }
    return out;
  }
}
