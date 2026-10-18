import type { GameContent, MapDef, ProjectileDef, TankDef, TileDef } from "../src/shared/schema/types";
import {
  validateContentRefs,
  validateMapDef,
  validateProjectileDef,
  validateTankDef,
  validateTileDefs,
} from "../src/shared/schema/validate";
import tilesJson from "./tiles.json";

// Mọi file trong data/tanks/*.json, data/projectiles/*.json và data/maps/*.json được nạp tự động:
// thêm xe, loại đạn hoặc bản đồ mới = thêm một file JSON, không sửa code.
const tankFiles = import.meta.glob("./tanks/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const projectileFiles = import.meta.glob("./projectiles/*.json", { eager: true, import: "default" }) as Record<
  string,
  unknown
>;
const mapFiles = import.meta.glob("./maps/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

const label = (path: string) => `data${path.slice(1)}`;

export function loadTankDefs(files: Record<string, unknown> = tankFiles): Record<string, TankDef> {
  const defs: Record<string, TankDef> = {};
  for (const [path, raw] of Object.entries(files)) {
    const def = validateTankDef(raw, label(path));
    if (defs[def.id]) throw new Error(`${label(path)}: id "${def.id}" bị trùng`);
    defs[def.id] = def;
  }
  return defs;
}

export function loadProjectileDefs(files: Record<string, unknown> = projectileFiles): Record<string, ProjectileDef> {
  const defs: Record<string, ProjectileDef> = {};
  for (const [path, raw] of Object.entries(files)) {
    const def = validateProjectileDef(raw, label(path));
    if (defs[def.id]) throw new Error(`${label(path)}: id "${def.id}" bị trùng`);
    defs[def.id] = def;
  }
  return defs;
}

export function loadTiles(raw: unknown = tilesJson): TileDef[] {
  return validateTileDefs(raw, "data/tiles.json");
}

export function loadMaps(tiles: readonly TileDef[], files: Record<string, unknown> = mapFiles): Record<string, MapDef> {
  const maps: Record<string, MapDef> = {};
  for (const [path, raw] of Object.entries(files)) {
    const def = validateMapDef(raw, tiles, label(path));
    if (maps[def.id]) throw new Error(`${label(path)}: id "${def.id}" bị trùng`);
    maps[def.id] = def;
  }
  return maps;
}

export function loadContent(): GameContent {
  const tiles = loadTiles();
  const content: GameContent = {
    tanks: loadTankDefs(),
    projectiles: loadProjectileDefs(),
    tiles,
    maps: loadMaps(tiles),
  };
  validateContentRefs(content);
  return content;
}
