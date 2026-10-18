import { Container, Graphics } from "pixi.js";
import { shade } from "./color";
import type { SpriteFactory, TankSpriteSpec, TankView } from "./SpriteFactory";

/**
 * Vẽ xe bằng hình khối PIXI.Graphics (giai đoạn M1-M5).
 * Quy ước hình vẽ: xe quay mặt về +x khi góc = 0, kích thước theo đơn vị bản đồ.
 */
export class GraphicsSpriteFactory implements SpriteFactory {
    createTank(spec: TankSpriteSpec): TankView {
        const r = spec.radius;
        const halfLen = r;
        const halfWid = r * 0.85;
        const track = halfWid * 0.38;

        const root = new Container();
        const hull = new Graphics();
        const turret = new Graphics();
        const status = new Graphics();
        const shield = new Graphics();

        // Xích hai bên
        hull.rect(-halfLen, -halfWid, halfLen * 2, track).fill(
            shade(spec.color, 0.45)
        );
        hull.rect(-halfLen, halfWid - track, halfLen * 2, track).fill(
            shade(spec.color, 0.45)
        );
        // Thân
        hull.roundRect(
            -halfLen * 0.9,
            -halfWid * 0.72,
            halfLen * 1.8,
            halfWid * 1.44,
            r * 0.12
        ).fill(spec.color);
        // Mũi tên chỉ hướng đầu xe
        hull.poly([
            halfLen * 0.45,
            -halfWid * 0.35,
            halfLen * 0.9,
            0,
            halfLen * 0.45,
            halfWid * 0.35,
        ]).fill({
            color: 0xffffff,
            alpha: 0.8,
        });

        // Tháp pháo + nòng súng
        turret
            .rect(0, -r * 0.14, r * 1.5, r * 0.28)
            .fill(shade(spec.color, 1.35));
        turret
            .circle(0, 0, r * 0.52)
            .fill(shade(spec.color, 1.2))
            .stroke({ width: r * 0.06, color: shade(spec.color, 0.6) });

        root.addChild(hull, turret, shield, status);

        const updateStatus = (
            hp: number,
            maxHp: number,
            reload: number,
            invulnerable: boolean
        ) => {
            // Khiên bảo vệ khi vừa xuất hiện
            shield.clear();
            if (invulnerable) {
                shield
                    .circle(0, 0, r * 1.3)
                    .fill({ color: 0x4fc3f7, alpha: 0.18 });
                shield
                    .circle(0, 0, r * 1.3)
                    .stroke({ width: 0.04, color: 0x81d4fa, alpha: 0.8 });
            }

            // Thanh máu + nạp đạn (luôn nằm ngang phía trên xe)
            status.clear();
            const barW = r * 2.2;
            const barH = 0.1;
            const x0 = -barW / 2;
            const y0 = -r * 1.45;

            // Nền thanh máu
            status
                .roundRect(x0 - 0.02, y0 - 0.02, barW + 0.04, barH + 0.04, 0.03)
                .fill(0x10141a);
            status.roundRect(x0, y0, barW, barH, 0.02).fill(0x263238);

            // Máu hiện tại
            const ratio = Math.max(0, Math.min(1, hp / maxHp));
            const hpColor =
                ratio > 0.5 ? 0x4caf50 : ratio > 0.25 ? 0xffb74d : 0xef5350;
            if (ratio > 0) {
                status
                    .roundRect(x0, y0, barW * ratio, barH, 0.02)
                    .fill(hpColor);
            }

            // Thanh nạp đạn nhỏ phía dưới thanh máu
            const relH = 0.035;
            const relY = y0 + barH + 0.03;
            status.rect(x0, relY, barW, relH).fill(0x1c232b);
            const relRatio = Math.max(0, Math.min(1, reload));
            if (relRatio > 0) {
                status
                    .rect(x0, relY, barW * relRatio, relH)
                    .fill(relRatio >= 1 ? 0xffd54f : 0x90a4ae);
            }
        };

        return {
            root,
            hull,
            turret,
            updateStatus,
            destroy: () => root.destroy({ children: true }),
        };
    }
}
