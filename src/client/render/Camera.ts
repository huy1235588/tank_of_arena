import type { Vec2 } from "../../shared/math/vec2";

/** Camera 2D thuần toán học (không phụ thuộc Pixi). (x, y) là điểm thế giới nằm giữa màn hình. */
export class Camera {
  x = 0;
  y = 0;
  /** Số pixel trên một đơn vị bản đồ. */
  zoom = 32;
  viewW = 800;
  viewH = 600;

  setViewport(w: number, h: number): void {
    this.viewW = w;
    this.viewH = h;
  }

  follow(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Giữ khung nhìn trong bản đồ (worldW x worldH). Nếu bản đồ nhỏ hơn màn hình theo một trục
   * thì căn giữa bản đồ theo trục đó.
   */
  clampTo(worldW: number, worldH: number): void {
    const halfW = this.viewW / this.zoom / 2;
    const halfH = this.viewH / this.zoom / 2;
    this.x = worldW <= halfW * 2 ? worldW / 2 : Math.min(Math.max(this.x, halfW), worldW - halfW);
    this.y = worldH <= halfH * 2 ? worldH / 2 : Math.min(Math.max(this.y, halfH), worldH - halfH);
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return {
      x: this.x + (sx - this.viewW / 2) / this.zoom,
      y: this.y + (sy - this.viewH / 2) / this.zoom,
    };
  }

  worldToScreen(wx: number, wy: number): Vec2 {
    return {
      x: (wx - this.x) * this.zoom + this.viewW / 2,
      y: (wy - this.y) * this.zoom + this.viewH / 2,
    };
  }
}
