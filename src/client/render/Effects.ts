import { Graphics } from "pixi.js";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: number;
    size: number;
    alpha: number;
    life: number;
    maxLife: number;
    drag: number;
}

interface Shockwave {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    color: number;
    alpha: number;
    life: number;
    maxLife: number;
}

/**
 * Hệ thống hiệu ứng hạt hình ảnh (tia lửa, khói, vụ nổ, mảnh vỡ tường gạch).
 * Cập nhật và vẽ trực tiếp lên một PIXI.Graphics duy nhất để đạt hiệu năng cao.
 */
export class EffectSystem {
    private readonly particles: Particle[] = [];
    private readonly shockwaves: Shockwave[] = [];

    /** Tia lửa đầu nòng súng khi bắn */
    spawnMuzzleFlash(
        x: number,
        y: number,
        angle: number,
        color = 0xffe082
    ): void {
        const count = 6;
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 0.8;
            const speed = 2 + Math.random() * 3.5;
            const a = angle + spread;
            this.particles.push({
                x,
                y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                color,
                size: 0.05 + Math.random() * 0.04,
                alpha: 1,
                life: 0.12 + Math.random() * 0.08,
                maxLife: 0.2,
                drag: 0.88,
            });
        }
    }

    /** Va chạm đạn vào tường hoặc xe */
    spawnHitSparks(x: number, y: number, color = 0xffca28, count = 10): void {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3;
            this.particles.push({
                x,
                y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                color,
                size: 0.04 + Math.random() * 0.04,
                alpha: 1,
                life: 0.15 + Math.random() * 0.12,
                maxLife: 0.27,
                drag: 0.85,
            });
        }
    }

    /** Mảnh vỡ gạch đỏ khi tường gạch bị bắn */
    spawnBrickDebris(x: number, y: number, count = 8): void {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2.5;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 0.4,
                y: y + (Math.random() - 0.5) * 0.4,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                color: Math.random() > 0.5 ? 0xa0522d : 0xcd853f,
                size: 0.06 + Math.random() * 0.05,
                alpha: 0.9,
                life: 0.25 + Math.random() * 0.2,
                maxLife: 0.45,
                drag: 0.82,
            });
        }
    }

    /** Vụ nổ lớn khi xe tăng bị tiêu diệt */
    spawnExplosion(x: number, y: number): void {
        // Vòng sóng xung kích
        this.shockwaves.push({
            x,
            y,
            radius: 0.2,
            maxRadius: 1.8,
            color: 0xffab40,
            alpha: 1,
            life: 0.35,
            maxLife: 0.35,
        });

        // Các mảnh lửa và khói
        const count = 35;
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5.5;
            const isFire = Math.random() > 0.3;
            const color = isFire
                ? Math.random() > 0.5
                    ? 0xff5722
                    : 0xffeb3b
                : 0x546e7a;
            this.particles.push({
                x,
                y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                color,
                size: 0.08 + Math.random() * 0.1,
                alpha: 1,
                life: 0.3 + Math.random() * 0.35,
                maxLife: 0.65,
                drag: 0.88,
            });
        }
    }

    updateAndDraw(g: Graphics, dt: number): void {
        g.clear();
        const frameDt = Math.min(dt, 0.1);

        // Cập nhật và vẽ sóng xung kích
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const s = this.shockwaves[i]!;
            s.life -= frameDt;
            if (s.life <= 0) {
                this.shockwaves.splice(i, 1);
                continue;
            }
            const progress = 1 - s.life / s.maxLife;
            s.radius += (s.maxRadius - s.radius) * (frameDt * 8);
            const alpha = (1 - progress) * s.alpha;
            g.circle(s.x, s.y, s.radius).stroke({
                width: 0.06 * (1 - progress),
                color: s.color,
                alpha,
            });
        }

        // Cập nhật và vẽ các hạt
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i]!;
            p.life -= frameDt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * frameDt;
            p.y += p.vy * frameDt;
            p.vx *= Math.pow(p.drag, frameDt * 60);
            p.vy *= Math.pow(p.drag, frameDt * 60);
            const progress = 1 - p.life / p.maxLife;
            const alpha = (1 - progress) * p.alpha;
            const size = p.size * (1 - progress * 0.4);

            g.circle(p.x, p.y, size).fill({ color: p.color, alpha });
        }
    }

    clear(): void {
        this.particles.length = 0;
        this.shockwaves.length = 0;
    }
}
