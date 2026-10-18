import type { Container } from "pixi.js";

/**
 * Renderer chỉ làm việc với TankView, không biết xe được vẽ bằng gì.
 * Khi có ảnh sprite, chỉ cần viết một SpriteFactory mới (ví dụ AtlasSpriteFactory).
 */
export interface TankView {
    /** Gốc của xe: Renderer đặt position. */
    readonly root: Container;
    /** Phần thân: Renderer đặt rotation = hullAngle. */
    readonly hull: Container;
    /** Phần tháp pháo: Renderer đặt rotation = turretAngle (world space, độc lập với thân). */
    readonly turret: Container;
    /** Cập nhật thanh máu, nạp đạn và khiên bảo vệ. */
    updateStatus(
        hp: number,
        maxHp: number,
        reload: number,
        invulnerable: boolean
    ): void;
    destroy(): void;
}

export interface TankSpriteSpec {
    defId: string;
    /** Bán kính hitbox (đơn vị bản đồ); hình vẽ co giãn theo giá trị này. */
    radius: number;
    /** Màu chủ đạo (0xRRGGBB), ví dụ màu phe. */
    color: number;
}

export interface SpriteFactory {
    createTank(spec: TankSpriteSpec): TankView;
}
