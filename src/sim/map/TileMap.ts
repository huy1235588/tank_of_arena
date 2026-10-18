import type { Vec2 } from "../../shared/math/vec2";
import type { MapDef, TileDef } from "../../shared/schema/types";
import { validateMapDef } from "../../shared/schema/validate";

/**
 * Bản đồ lưới trong bộ nhớ. 1 ô = 1 đơn vị thế giới; ô (col, row) phủ [col, col+1) x [row, row+1).
 * Mọi ô nằm ngoài bản đồ được coi là tường đặc, nên xe và đạn không bao giờ thoát khỏi bản đồ.
 */
export class TileMap {
    readonly id: string;
    readonly name: string;
    readonly cols: number;
    readonly rows: number;
    readonly defs: readonly TileDef[];
    /** Điểm xuất phát theo đội (tâm ô), theo thứ tự quét từng hàng từ trên xuống. */
    readonly spawns: ReadonlyMap<number, readonly Vec2[]>;

    private readonly cells: Uint8Array;
    /** Máu còn lại của từng ô (chỉ có nghĩa với tile có hp). */
    private readonly cellHp: Float64Array;
    private readonly indexById = new Map<string, number>();
    private readonly moveBlock: Uint8Array;
    private readonly projectileBlock: Uint8Array;
    private readonly hides: Uint8Array;

    private constructor(def: MapDef, defs: readonly TileDef[]) {
        this.id = def.id;
        this.name = def.name;
        this.rows = def.rows.length;
        this.cols = def.rows[0]!.length;
        this.defs = defs;

        const indexByGlyph = new Map<string, number>();
        defs.forEach((t, i) => {
            indexByGlyph.set(t.glyph, i);
            this.indexById.set(t.id, i);
        });
        const floorIndex = defs.findIndex((t) => t.id === "floor");

        this.moveBlock = Uint8Array.from(defs, (t) => (t.blocksMove ? 1 : 0));
        this.projectileBlock = Uint8Array.from(defs, (t) =>
            t.blocksProjectile ? 1 : 0
        );
        this.hides = Uint8Array.from(defs, (t) => (t.hidesUnits ? 1 : 0));

        this.cells = new Uint8Array(this.cols * this.rows);
        const spawns = new Map<number, Vec2[]>();
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const ch = def.rows[r]![c]!;
                const index = indexByGlyph.get(ch);
                if (index !== undefined) {
                    this.cells[r * this.cols + c] = index;
                } else {
                    // Chữ số 1-9: điểm xuất phát của đội, nền là floor (validateMapDef đã loại ký tự lạ)
                    this.cells[r * this.cols + c] = floorIndex;
                    const team = Number(ch);
                    let list = spawns.get(team);
                    if (!list) spawns.set(team, (list = []));
                    list.push({ x: c + 0.5, y: r + 0.5 });
                }
            }
        }
        this.spawns = spawns;

        this.cellHp = new Float64Array(this.cells.length);
        for (let i = 0; i < this.cells.length; i++)
            this.cellHp[i] = defs[this.cells[i]!]!.hp ?? 0;
    }

    /** Dựng từ dữ liệu; kiểm tra lại dữ liệu và ném lỗi rõ ràng nếu sai. */
    static fromDef(def: MapDef, tiles: readonly TileDef[]): TileMap {
        return new TileMap(
            validateMapDef(def, tiles, `map "${def.id}"`),
            tiles
        );
    }

    private inside(col: number, row: number): boolean {
        return col >= 0 && row >= 0 && col < this.cols && row < this.rows;
    }

    /** Định nghĩa tile tại ô; null nếu ngoài bản đồ. */
    tileAt(col: number, row: number): TileDef | null {
        return this.inside(col, row)
            ? this.defs[this.cells[row * this.cols + col]!]!
            : null;
    }

    /** Ô chặn di chuyển của xe (ngoài bản đồ = chặn). */
    blocksMove(col: number, row: number): boolean {
        return (
            !this.inside(col, row) ||
            this.moveBlock[this.cells[row * this.cols + col]!] === 1
        );
    }

    /** Ô chặn đạn (ngoài bản đồ = chặn). */
    blocksProjectile(col: number, row: number): boolean {
        return (
            !this.inside(col, row) ||
            this.projectileBlock[this.cells[row * this.cols + col]!] === 1
        );
    }

    /** Điểm (x, y) có nằm trong ô che giấu (bụi cỏ) không. */
    hidesUnitsAt(x: number, y: number): boolean {
        const col = Math.floor(x);
        const row = Math.floor(y);
        return (
            this.inside(col, row) &&
            this.hides[this.cells[row * this.cols + col]!] === 1
        );
    }

    spawnPoints(team: number): readonly Vec2[] {
        return this.spawns.get(team) ?? [];
    }

    /** Máu còn lại của ô; 0 nếu ngoài bản đồ hoặc tile không phá được. */
    tileHp(col: number, row: number): number {
        return this.inside(col, row) ? this.cellHp[row * this.cols + col]! : 0;
    }

    /**
     * Gây sát thương lên ô. Chỉ tile có hp mới bị ảnh hưởng; tường thép và ô ngoài bản đồ trả về null.
     * Khi hết máu, ô được thay bằng `becomesOnDestroy` (mặc định floor) và `destroyed` = true.
     */
    damageTile(
        col: number,
        row: number,
        amount: number
    ): { hp: number; maxHp: number; destroyed: boolean } | null {
        if (!this.inside(col, row) || amount <= 0) return null;
        const i = row * this.cols + col;
        const def = this.defs[this.cells[i]!]!;
        if (def.hp === undefined) return null;

        const hp = Math.max(0, this.cellHp[i]! - amount);
        this.cellHp[i] = hp;
        if (hp > 0) return { hp, maxHp: def.hp, destroyed: false };

        this.setTile(col, row, def.becomesOnDestroy ?? "floor");
        return { hp: 0, maxHp: def.hp, destroyed: true };
    }

    /** Đổi loại tile của một ô (máu được đặt lại theo tile mới). */
    setTile(col: number, row: number, tileId: string): void {
        const index = this.indexById.get(tileId);
        if (index === undefined)
            throw new Error(`TileMap: không có tile "${tileId}"`);
        if (!this.inside(col, row))
            throw new Error(`TileMap: ô (${col}, ${row}) nằm ngoài bản đồ`);
        const i = row * this.cols + col;
        this.cells[i] = index;
        this.cellHp[i] = this.defs[index]!.hp ?? 0;
    }
}
