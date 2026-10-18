import type { GameContent, MapDef, ProjectileDef, TankDef, TileDef } from "./types";

const ROLES = ["tank", "assassin", "support", "sniper"] as const;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function obj(parent: Obj, key: string, where: string): Obj {
  const v = parent[key];
  if (!isObj(v)) throw new Error(`${where}: thiếu object "${key}"`);
  return v;
}

function str(parent: Obj, key: string, where: string): string {
  const v = parent[key];
  if (typeof v !== "string" || v.length === 0) throw new Error(`${where}: "${key}" phải là chuỗi không rỗng`);
  return v;
}

function num(parent: Obj, key: string, where: string, min = 0, minExclusive = true, max = Infinity): number {
  const v = parent[key];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${where}: "${key}" phải là số hữu hạn`);
  if (minExclusive ? v <= min : v < min) {
    throw new Error(`${where}: "${key}" phải ${minExclusive ? ">" : ">="} ${min} (nhận ${v})`);
  }
  if (v > max) throw new Error(`${where}: "${key}" phải <= ${max} (nhận ${v})`);
  return v;
}

function bool(parent: Obj, key: string, where: string): boolean {
  const v = parent[key];
  if (typeof v !== "boolean") throw new Error(`${where}: "${key}" phải là true hoặc false`);
  return v;
}

/** Kiểm tra dữ liệu xe tăng đọc từ JSON; ném lỗi nêu rõ file và trường sai. (zod sẽ thay thế ở M4.) */
export function validateTankDef(raw: unknown, source = "tank"): TankDef {
  if (!isObj(raw)) throw new Error(`${source}: phải là object`);
  const stats = obj(raw, "stats", source);
  const weapon = obj(raw, "weapon", source);
  const sprite = obj(raw, "sprite", source);

  const role = str(raw, "role", source);
  if (!(ROLES as readonly string[]).includes(role)) {
    throw new Error(`${source}: role "${role}" không hợp lệ (cho phép: ${ROLES.join(", ")})`);
  }

  const muzzle = weapon["muzzleOffset"];
  if (!Array.isArray(muzzle) || muzzle.length !== 2 || muzzle.some((n) => typeof n !== "number")) {
    throw new Error(`${source}: weapon.muzzleOffset phải là [x, y]`);
  }

  const skills = raw["skills"];
  if (!Array.isArray(skills) || skills.length > 3 || skills.some((s) => typeof s !== "string")) {
    throw new Error(`${source}: skills phải là mảng tối đa 3 chuỗi`);
  }

  const def: TankDef = {
    id: str(raw, "id", source),
    name: str(raw, "name", source),
    role: role as TankDef["role"],
    stats: {
      maxHp: num(stats, "maxHp", `${source}.stats`),
      armor: num(stats, "armor", `${source}.stats`, 0, false),
      moveSpeed: num(stats, "moveSpeed", `${source}.stats`),
      hullTurnRate: num(stats, "hullTurnRate", `${source}.stats`),
      turretTurnRate: num(stats, "turretTurnRate", `${source}.stats`),
      radius: num(stats, "radius", `${source}.stats`, 0, true, 1),
    },
    weapon: {
      projectile: str(weapon, "projectile", `${source}.weapon`),
      fireInterval: num(weapon, "fireInterval", `${source}.weapon`),
      muzzleOffset: [muzzle[0] as number, muzzle[1] as number],
    },
    skills: skills as string[],
    sprite: {
      hull: str(sprite, "hull", `${source}.sprite`),
      turret: str(sprite, "turret", `${source}.sprite`),
    },
  };
  if (weapon["spreadDeg"] !== undefined) {
    def.weapon.spreadDeg = num(weapon, "spreadDeg", `${source}.weapon`, 0, false, 45);
  }
  return def;
}

/** Kiểm tra dữ liệu đạn (data/projectiles/*.json). */
export function validateProjectileDef(raw: unknown, source = "projectile"): ProjectileDef {
  if (!isObj(raw)) throw new Error(`${source}: phải là object`);
  const def: ProjectileDef = {
    id: str(raw, "id", source),
    speed: num(raw, "speed", source),
    damage: num(raw, "damage", source, 0, false),
    range: num(raw, "range", source),
    radius: num(raw, "radius", source, 0, true, 0.5),
  };
  if (raw["wallDamage"] !== undefined) def.wallDamage = num(raw, "wallDamage", source, 0, false);
  if (raw["color"] !== undefined) {
    const color = str(raw, "color", source);
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error(`${source}: color phải dạng "#rrggbb" (nhận "${color}")`);
    def.color = color;
  }
  return def;
}

/** Kiểm tra chéo giữa các loại dữ liệu (ví dụ xe trỏ tới loại đạn không tồn tại). */
export function validateContentRefs(content: GameContent): void {
  for (const tank of Object.values(content.tanks)) {
    if (!content.projectiles[tank.weapon.projectile]) {
      throw new Error(
        `tank "${tank.id}": weapon.projectile "${tank.weapon.projectile}" không có trong data/projectiles`,
      );
    }
  }
}

/** Kiểm tra danh sách địa hình (data/tiles.json). */
export function validateTileDefs(raw: unknown, source = "tiles"): TileDef[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error(`${source}: phải là mảng không rỗng`);
  if (raw.length > 255) throw new Error(`${source}: tối đa 255 loại tile`);

  const tiles: TileDef[] = [];
  const ids = new Set<string>();
  const glyphs = new Set<string>();

  raw.forEach((item: unknown, i: number) => {
    const where = `${source}[${i}]`;
    if (!isObj(item)) throw new Error(`${where}: phải là object`);

    const id = str(item, "id", where);
    const glyph = str(item, "glyph", where);
    if ([...glyph].length !== 1 || /[0-9\s]/.test(glyph)) {
      throw new Error(`${where}: glyph "${glyph}" phải là một ký tự, không phải chữ số hoặc khoảng trắng`);
    }
    if (ids.has(id)) throw new Error(`${where}: id "${id}" bị trùng`);
    if (glyphs.has(glyph)) throw new Error(`${where}: glyph "${glyph}" bị trùng`);
    ids.add(id);
    glyphs.add(glyph);

    const tile: TileDef = {
      id,
      glyph,
      blocksMove: bool(item, "blocksMove", where),
      blocksProjectile: bool(item, "blocksProjectile", where),
    };
    if (item["hp"] !== undefined) tile.hp = num(item, "hp", where);
    if (item["becomesOnDestroy"] !== undefined) tile.becomesOnDestroy = str(item, "becomesOnDestroy", where);
    if (item["hidesUnits"] !== undefined) tile.hidesUnits = bool(item, "hidesUnits", where);
    if (item["moveSpeedMul"] !== undefined) tile.moveSpeedMul = num(item, "moveSpeedMul", where);
    if (item["color"] !== undefined) {
      const color = str(item, "color", where);
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error(`${where}: color phải dạng "#rrggbb" (nhận "${color}")`);
      tile.color = color;
    }
    tiles.push(tile);
  });

  if (!ids.has("floor")) throw new Error(`${source}: thiếu tile có id "floor"`);
  tiles.forEach((t, i) => {
    if (t.becomesOnDestroy !== undefined && !ids.has(t.becomesOnDestroy)) {
      throw new Error(`${source}[${i}]: becomesOnDestroy "${t.becomesOnDestroy}" không tồn tại`);
    }
  });
  return tiles;
}

/** Kiểm tra bản đồ ASCII: hàng đều nhau, mọi ký tự là glyph đã định nghĩa hoặc chữ số 1-9 (điểm xuất phát). */
export function validateMapDef(raw: unknown, tiles: readonly TileDef[], source = "map"): MapDef {
  if (!isObj(raw)) throw new Error(`${source}: phải là object`);
  const id = str(raw, "id", source);
  const name = str(raw, "name", source);
  const rows = raw["rows"];
  if (!Array.isArray(rows) || rows.length < 3 || rows.some((r) => typeof r !== "string")) {
    throw new Error(`${source}: rows phải là mảng ít nhất 3 chuỗi`);
  }

  const glyphs = new Set(tiles.map((t) => t.glyph));
  const width = (rows[0] as string).length;
  if (width < 3) throw new Error(`${source}: bản đồ rộng ít nhất 3 ô`);

  rows.forEach((row: string, r: number) => {
    if (row.length !== width) {
      throw new Error(`${source}: hàng ${r} dài ${row.length}, khác hàng 0 (${width})`);
    }
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]!;
      if (!glyphs.has(ch) && !/[1-9]/.test(ch)) {
        throw new Error(`${source}: ký tự "${ch}" không xác định ở hàng ${r}, cột ${c}`);
      }
    }
  });

  return { id, name, rows: rows as string[] };
}
