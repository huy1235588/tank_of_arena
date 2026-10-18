export interface DebugInfo {
  fps: number;
  tick: number;
  mapName: string;
  col: number;
  row: number;
  inBush: boolean;
  hullDeg: number;
  turretDeg: number;
  aimX: number;
  aimY: number;
  tanks: number;
  projectiles?: number;
  hp?: number;
  maxHp?: number;
}

/** Bảng thông số debug ở góc trái trên. F3 để bật/tắt (cũng bật hitbox và hướng thân/tháp pháo). */
export class DebugOverlay {
  visible = true;
  private readonly el: HTMLPreElement;

  constructor() {
    this.el = document.createElement("pre");
    Object.assign(this.el.style, {
      position: "fixed",
      left: "8px",
      top: "8px",
      margin: "0",
      padding: "6px 8px",
      font: "12px/1.4 ui-monospace, Menlo, Consolas, monospace",
      color: "#cfd8dc",
      background: "rgba(0,0,0,0.45)",
      borderRadius: "4px",
      pointerEvents: "none",
      whiteSpace: "pre",
      zIndex: "1000",
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(this.el);

    window.addEventListener("keydown", (e) => {
      if (e.code === "F3") {
        e.preventDefault();
        this.visible = !this.visible;
        this.el.style.display = this.visible ? "block" : "none";
      }
    });
  }

  update(info: DebugInfo): void {
    if (!this.visible) return;
    let text =
      `FPS      ${info.fps.toFixed(0)}\n` +
      `tick     ${info.tick}\n` +
      `bản đồ   ${info.mapName}\n` +
      `ô        ${info.col}, ${info.row}${info.inBush ? "  (trong bụi cỏ)" : ""}\n` +
      `thân     ${info.hullDeg.toFixed(0)}°  (cam)\n` +
      `tháp     ${info.turretDeg.toFixed(0)}°  (xanh lá)\n` +
      `ngắm     ${info.aimX.toFixed(1)}, ${info.aimY.toFixed(1)}\n` +
      `xe       ${info.tanks}\n`;

    if (info.projectiles !== undefined) {
      text += `đạn      ${info.projectiles}\n`;
    }
    if (info.hp !== undefined && info.maxHp !== undefined) {
      text += `máu      ${info.hp.toFixed(0)} / ${info.maxHp}\n`;
    }
    text += `F3: ẩn/hiện debug`;
    this.el.textContent = text;
  }
}
