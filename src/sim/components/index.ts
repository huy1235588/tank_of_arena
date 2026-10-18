/** Component = dữ liệu thuần, không có logic. */

export interface Transform {
  x: number;
  y: number;
}

export interface Hull {
  /** Góc thân xe, world space (radian). */
  angle: number;
  turnRate: number;
}

export interface Turret {
  /** Góc tháp pháo, world space (radian) - không phụ thuộc góc thân. */
  angle: number;
  turnRate: number;
}

export interface Mobility {
  moveSpeed: number;
  radius: number;
}

/** Input đã được làm sạch của người điều khiển xe này. */
export interface Controller {
  playerId: number;
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  fire: boolean;
  skills: number;
}

export interface TankInfo {
  defId: string;
  team: number;
}

export interface Health {
  hp: number;
  maxHp: number;
  /** Giảm sát thương: dmg * 100 / (100 + armor). */
  armor: number;
  /** Số tick bất tử còn lại (bảo vệ khi vừa xuất hiện). */
  invulnTicks: number;
  /** playerId của phát bắn cuối cùng gây sát thương (-1 = chưa có), dùng để tính mạng hạ. */
  lastHitBy: number;
}

export interface Weapon {
  projectileId: string;
  /** Số tick giữa hai phát bắn (số nguyên, để kết quả xác định tuyệt đối). */
  intervalTicks: number;
  /** Số tick còn lại trước khi bắn được (0 = sẵn sàng). */
  cooldownTicks: number;
  /** Vị trí nòng trong hệ trục tháp pháo (x: phía trước, y: bên phải). */
  muzzleX: number;
  muzzleY: number;
  /** Độ lệch tối đa mỗi bên (radian). */
  spread: number;
}

export interface Projectile {
  defId: string;
  /** Entity xe đã bắn (có thể đã bị phá hủy khi đạn còn bay). */
  ownerId: number;
  ownerPlayerId: number;
  team: number;
  /** Hướng bay (radian) và vector đơn vị tương ứng. */
  angle: number;
  dirX: number;
  dirY: number;
  speed: number;
  damage: number;
  wallDamage: number;
  radius: number;
  /** Quãng bay còn lại. */
  remaining: number;
}
