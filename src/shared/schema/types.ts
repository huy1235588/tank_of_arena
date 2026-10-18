/** Định nghĩa dữ liệu (data-driven). Quy ước: 1 đơn vị thế giới = 1 ô bản đồ. */

export interface TankStats {
    maxHp: number;
    /** Giảm sát thương: dmg * 100 / (100 + armor). */
    armor: number;
    /** Đơn vị bản đồ (1 ô = 1 đơn vị) mỗi giây. */
    moveSpeed: number;
    /** Tốc độ xoay thân, rad/giây. */
    hullTurnRate: number;
    /** Tốc độ xoay tháp pháo, rad/giây (số rất lớn = ngắm gần như tức thời). */
    turretTurnRate: number;
    /** Bán kính hitbox tròn, đơn vị bản đồ. Phải <= 1 (giới hạn của SpatialHash). */
    radius: number;
}

export interface TankWeapon {
    /** id trong data/projectiles. */
    projectile: string;
    /** Giây giữa hai phát bắn. */
    fireInterval: number;
    /** Vị trí nòng so với tâm xe, trong hệ trục của tháp pháo. */
    muzzleOffset: [number, number];
    /** Độ lệch ngẫu nhiên tối đa mỗi bên (độ), lấy từ Rng có seed của sim. Mặc định 0. */
    spreadDeg?: number;
}

/** Một loại đạn (data/projectiles/*.json). */
export interface ProjectileDef {
    id: string;
    /** Đơn vị bản đồ mỗi giây. Không giới hạn: đạn được quét theo đoạn thẳng nên không xuyên tường. */
    speed: number;
    /** Sát thương gốc lên xe (trước khi trừ giáp). */
    damage: number;
    /** Quãng bay tối đa (đơn vị bản đồ), tính từ nòng. */
    range: number;
    /** Bán kính khi va chạm với xe. Với tường, đạn được coi là một điểm. */
    radius: number;
    /** Sát thương lên tường phá được (tile có hp). Mặc định 1. */
    wallDamage?: number;
    /** Gợi ý màu vẽ, dạng "#rrggbb". */
    color?: string;
}

export interface TankDef {
    id: string;
    name: string;
    role: "tank" | "assassin" | "support" | "sniper";
    stats: TankStats;
    weapon: TankWeapon;
    /** id trong data/skills (dùng từ M4), tối đa 3 slot. */
    skills: string[];
    sprite: { hull: string; turret: string };
}

/** Một loại địa hình. Tile có id "floor" là bắt buộc (nền mặc định, cũng là nền của ô xuất phát). */
export interface TileDef {
    id: string;
    /** Ký tự duy nhất dùng trong bản đồ ASCII (không được là chữ số 0-9 hoặc khoảng trắng). */
    glyph: string;
    blocksMove: boolean;
    blocksProjectile: boolean;
    /** Có hp = tường bắn vỡ được. */
    hp?: number;
    /** id tile thay thế khi bị phá. */
    becomesOnDestroy?: string;
    /** Bụi cỏ: ẩn thân. */
    hidesUnits?: boolean;
    moveSpeedMul?: number;
    /** Gợi ý màu vẽ, dạng "#rrggbb". */
    color?: string;
}

/**
 * Bản đồ dạng ASCII: mỗi chuỗi là một hàng, mỗi ký tự là một ô.
 * Chữ số 1-9 là điểm xuất phát của đội tương ứng (nền là "floor").
 */
export interface MapDef {
    id: string;
    name: string;
    rows: string[];
}

/** Toàn bộ nội dung game nạp từ data/. */
export interface GameContent {
    tanks: Record<string, TankDef>;
    projectiles: Record<string, ProjectileDef>;
    tiles: TileDef[];
    maps: Record<string, MapDef>;
}
