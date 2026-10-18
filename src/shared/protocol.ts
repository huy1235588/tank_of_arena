/**
 * Giao thức giữa Client và Simulation. Chỉ chứa dữ liệu thuần (JSON-serializable),
 * để sau này đi qua mạng mà không phải đổi logic.
 */

/** Lệnh nhập liệu của một người chơi (hoặc bot) trong một tick. */
export interface InputCmd {
  tick: number;
  playerId: number;
  /** Hướng di chuyển, mỗi trục -1..1 (Simulation tự chuẩn hóa độ dài <= 1). */
  moveX: number;
  moveY: number;
  /** Điểm ngắm trong tọa độ thế giới. */
  aimX: number;
  aimY: number;
  fire: boolean;
  /** Bitmask kỹ năng: xem SKILL_Q / SKILL_E / SKILL_SPACE. */
  skills: number;
}

export interface TankSnapshot {
  id: number;
  playerId: number;
  team: number;
  defId: string;
  x: number;
  y: number;
  /** Góc thân xe (world space, radian). */
  hullAngle: number;
  /** Góc tháp pháo (world space, radian) - độc lập với thân xe. */
  turretAngle: number;
  radius: number;
  /** Tâm xe đang nằm trong bụi cỏ (do sim quyết định, không phải renderer). */
  inBush: boolean;
  hp: number;
  maxHp: number;
  /** Tiến độ nạp đạn 0..1 (1 = bắn được ngay). */
  reload: number;
  /** Đang được bảo vệ sau khi xuất hiện (không nhận sát thương). */
  invulnerable: boolean;
}

export interface ProjectileSnapshot {
  id: number;
  defId: string;
  team: number;
  x: number;
  y: number;
  /** Hướng bay (radian). */
  angle: number;
  radius: number;
}

export interface PlayerSnapshot {
  playerId: number;
  team: number;
  kills: number;
  deaths: number;
  alive: boolean;
  /** Số tick còn lại trước khi hồi sinh (0 nếu đang sống). */
  respawnTicks: number;
}

export interface Snapshot {
  tick: number;
  tanks: TankSnapshot[];
  projectiles: ProjectileSnapshot[];
  players: PlayerSnapshot[];
}

/** Điểm va chạm của đạn: trúng xe, trúng tường, hoặc hết tầm bay. */
export type HitKind = "tank" | "wall" | "expire";

/**
 * Sự kiện rời rạc phát sinh trong một tick (âm thanh, hiệu ứng, thông báo).
 * Trạng thái liên tục (vị trí, máu...) nằm trong Snapshot; riêng ô bản đồ thay đổi được báo qua TileDamaged/TileChanged.
 */
export type GameEvent =
  | { type: "TankSpawned"; id: number; playerId: number }
  | { type: "ProjectileFired"; id: number; ownerId: number; playerId: number; x: number; y: number; angle: number }
  | { type: "ProjectileHit"; id: number; kind: HitKind; x: number; y: number; targetId?: number }
  | { type: "TankDamaged"; id: number; playerId: number; byPlayerId: number; amount: number; hp: number; x: number; y: number }
  | { type: "TankDestroyed"; id: number; playerId: number; byPlayerId: number; x: number; y: number }
  | { type: "TileDamaged"; col: number; row: number; hp: number; maxHp: number }
  | { type: "TileChanged"; col: number; row: number; tileId: string };
