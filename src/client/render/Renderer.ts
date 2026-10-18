import { Application, Container, Graphics } from "pixi.js";
import { angleDiff, wrap } from "../../shared/math/angle";
import type { GameEvent, ProjectileSnapshot, Snapshot, TankSnapshot } from "../../shared/protocol";
import type { ProjectileDef, TileDef } from "../../shared/schema/types";
import type { TileMap } from "../../sim/map/TileMap";
import type { SoundEffects } from "../audio/SoundEffects";
import { Camera } from "./Camera";
import { parseColor, shade } from "./color";
import { EffectSystem } from "./Effects";
import type { SpriteFactory, TankView } from "./SpriteFactory";

const ALLY_COLOR = 0x4fc3f7;
const ENEMY_COLOR = 0xef5350;
/** Độ mờ của xe khi đứng trong bụi cỏ. */
const BUSH_ALPHA = 0.55;

/**
 * Chỉ đọc Snapshot rồi vẽ; không bao giờ sửa trạng thái game.
 * Nội suy giữa snapshot trước và hiện tại theo alpha để chuyển động mượt trên màn hình 144 Hz.
 *
 * Thứ tự lớp (dưới lên trên): nền + lưới, tường, xe, đạn, bụi cỏ, hiệu ứng (tia lửa, nổ), debug.
 * Bụi cỏ nằm trên xe và đạn nên xe trong bụi bị che một phần.
 */
export class Renderer {
  readonly camera = new Camera();
  readonly effects = new EffectSystem();
  debug = false;

  private readonly worldLayer = new Container();
  private readonly floorLayer = new Graphics();
  private readonly wallLayer = new Graphics();
  private readonly tankLayer = new Container();
  private readonly projectileLayer = new Graphics();
  private readonly bushLayer = new Graphics();
  private readonly effectLayer = new Graphics();
  private readonly debugLayer = new Graphics();

  private readonly views = new Map<number, TankView>();
  private readonly prevById = new Map<number, TankSnapshot>();
  private readonly prevProjById = new Map<number, ProjectileSnapshot>();
  private current: Snapshot | null = null;

  private constructor(
    private readonly app: Application,
    private readonly sprites: SpriteFactory,
    private readonly localPlayerId: number,
    private readonly map: TileMap,
    private readonly projectileDefs: Readonly<Record<string, ProjectileDef>>,
    private readonly audio?: SoundEffects,
  ) {
    this.worldLayer.addChild(
      this.floorLayer,
      this.wallLayer,
      this.tankLayer,
      this.projectileLayer,
      this.bushLayer,
      this.effectLayer,
      this.debugLayer,
    );
    this.app.stage.addChild(this.worldLayer);
    this.buildMapLayers();
  }

  static async create(
    host: HTMLElement,
    sprites: SpriteFactory,
    localPlayerId: number,
    map: TileMap,
    projectileDefs: Readonly<Record<string, ProjectileDef>> = {},
    audio?: SoundEffects,
  ): Promise<Renderer> {
    const app = new Application();
    await app.init({
      resizeTo: window,
      background: 0x14171c,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    app.ticker.stop(); // GameLoop tự gọi render, tránh vẽ hai lần
    host.appendChild(app.canvas);
    return new Renderer(app, sprites, localPlayerId, map, projectileDefs, audio);
  }

  get canvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  /** Xử lý các sự kiện chiến đấu từ sim: âm thanh, tia lửa, nổ, cập nhật tường */
  handleEvents(events: readonly GameEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case "ProjectileFired": {
          this.effects.spawnMuzzleFlash(e.x, e.y, e.angle);
          this.audio?.playFire(e.playerId === this.localPlayerId);
          break;
        }
        case "ProjectileHit": {
          if (e.kind === "wall") {
            this.effects.spawnHitSparks(e.x, e.y, 0xffd54f, 8);
            this.audio?.playHitWall();
          } else if (e.kind === "tank") {
            this.effects.spawnHitSparks(e.x, e.y, 0xff7043, 14);
            this.audio?.playHitTank();
          }
          break;
        }
        case "TankDamaged": {
          this.effects.spawnHitSparks(e.x, e.y, 0xff5252, 10);
          break;
        }
        case "TankDestroyed": {
          this.effects.spawnExplosion(e.x, e.y);
          this.audio?.playDestroy();
          break;
        }
        case "TankSpawned": {
          if (e.playerId === this.localPlayerId) {
            this.audio?.playRespawn();
          }
          break;
        }
        case "TileDamaged": {
          this.effects.spawnBrickDebris(e.col + 0.5, e.row + 0.5, 6);
          this.rebuildWalls();
          break;
        }
        case "TileChanged": {
          this.effects.spawnBrickDebris(e.col + 0.5, e.row + 0.5, 16);
          this.rebuildWalls();
          break;
        }
      }
    }
  }

  draw(snapshot: Snapshot, alpha: number, dt = 1 / 60): void {
    this.syncSnapshot(snapshot);
    this.camera.setViewport(this.app.screen.width, this.app.screen.height);

    let localTeam = -1;
    for (const t of snapshot.tanks) if (t.playerId === this.localPlayerId) localTeam = t.team;

    for (const tank of snapshot.tanks) {
      const view = this.viewFor(tank, localTeam);
      const prev = this.prevById.get(tank.id) ?? tank;

      const x = prev.x + (tank.x - prev.x) * alpha;
      const y = prev.y + (tank.y - prev.y) * alpha;
      view.root.position.set(x, y);
      view.root.alpha = tank.inBush ? BUSH_ALPHA : 1;
      view.hull.rotation = wrap(prev.hullAngle + angleDiff(prev.hullAngle, tank.hullAngle) * alpha);
      view.turret.rotation = wrap(prev.turretAngle + angleDiff(prev.turretAngle, tank.turretAngle) * alpha);
      view.updateStatus(tank.hp, tank.maxHp, tank.reload, tank.invulnerable);

      if (tank.playerId === this.localPlayerId) this.camera.follow(x, y);
    }
    this.removeStaleViews(snapshot);

    this.drawProjectiles(snapshot, alpha, localTeam);
    this.effects.updateAndDraw(this.effectLayer, dt);

    this.camera.clampTo(this.map.cols, this.map.rows);
    this.worldLayer.scale.set(this.camera.zoom);
    this.worldLayer.position.set(
      this.camera.viewW / 2 - this.camera.x * this.camera.zoom,
      this.camera.viewH / 2 - this.camera.y * this.camera.zoom,
    );

    this.drawDebug(snapshot);
    this.app.render();
  }

  destroy(): void {
    this.effects.clear();
    this.app.destroy(true, { children: true });
  }

  /** Khi sang tick mới, snapshot cũ trở thành "trước" để nội suy. */
  private syncSnapshot(snapshot: Snapshot): void {
    if (this.current && this.current.tick !== snapshot.tick) {
      this.prevById.clear();
      for (const t of this.current.tanks) this.prevById.set(t.id, t);
      this.prevProjById.clear();
      for (const p of this.current.projectiles) this.prevProjById.set(p.id, p);
    }
    this.current = snapshot;
  }

  private drawProjectiles(snapshot: Snapshot, alpha: number, localTeam: number): void {
    const g = this.projectileLayer;
    g.clear();

    for (const p of snapshot.projectiles) {
      const prev = this.prevProjById.get(p.id) ?? p;
      const x = prev.x + (p.x - prev.x) * alpha;
      const y = prev.y + (p.y - prev.y) * alpha;

      const def = this.projectileDefs[p.defId];
      const baseColor = def?.color ? parseColor(def.color, 0xffd54f) : p.team === localTeam ? 0xffeb3b : 0xff7043;
      const r = p.radius;
      const len = r * 2.8;

      const cos = Math.cos(p.angle);
      const sin = Math.sin(p.angle);

      // Vệt sáng kéo dài phía sau đạn (bullet tracer)
      g.moveTo(x - cos * len, y - sin * len).lineTo(x, y);
      g.stroke({ width: r * 1.8, color: baseColor, alpha: 0.45 });

      // Đầu đạn sáng lóa
      g.circle(x, y, r).fill(baseColor);
      g.circle(x, y, r * 0.55).fill(0xffffff);
    }
  }

  private viewFor(tank: TankSnapshot, localTeam: number): TankView {
    let view = this.views.get(tank.id);
    if (!view) {
      view = this.sprites.createTank({
        defId: tank.defId,
        radius: tank.radius,
        color: tank.team === localTeam ? ALLY_COLOR : ENEMY_COLOR,
      });
      this.views.set(tank.id, view);
      this.tankLayer.addChild(view.root);
    }
    return view;
  }

  private removeStaleViews(snapshot: Snapshot): void {
    if (this.views.size === snapshot.tanks.length) return;
    const alive = new Set(snapshot.tanks.map((t) => t.id));
    for (const [id, view] of this.views) {
      if (!alive.has(id)) {
        view.destroy();
        this.views.delete(id);
      }
    }
  }

  /** Vẽ lại toàn bộ bản đồ */
  private buildMapLayers(): void {
    const { cols, rows } = this.map;
    const floorDef = this.map.defs.find((d) => d.id === "floor");

    const floor = this.floorLayer;
    floor.clear();
    floor.rect(0, 0, cols, rows).fill(parseColor(floorDef?.color, 0x1d222a));
    for (let x = 1; x < cols; x++) floor.moveTo(x, 0).lineTo(x, rows);
    for (let y = 1; y < rows; y++) floor.moveTo(0, y).lineTo(cols, y);
    floor.stroke({ width: 0.02, color: 0x2a313b });

    // Vòng đánh dấu điểm xuất phát của từng đội
    for (const [team, points] of this.map.spawns) {
      for (const p of points) {
        floor.circle(p.x, p.y, 0.38).stroke({ width: 0.05, color: team === 1 ? ALLY_COLOR : ENEMY_COLOR, alpha: 0.35 });
      }
    }

    this.rebuildWalls();

    // Bụi cỏ
    this.bushLayer.clear();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const def = this.map.tileAt(col, row);
        if (def && def.hidesUnits) this.drawBush(def, col, row);
      }
    }
  }

  /** Vẽ lại các ô tường (gọi khi có ô gạch bị nứt hoặc phá hủy) */
  private rebuildWalls(): void {
    const g = this.wallLayer;
    g.clear();
    const { cols, rows } = this.map;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const def = this.map.tileAt(col, row);
        if (!def || def.id === "floor" || def.hidesUnits) continue;
        this.drawSolid(def, col, row);
      }
    }
  }

  private drawSolid(def: TileDef, col: number, row: number): void {
    const g = this.wallLayer;
    const base = parseColor(def.color, 0x808080);
    g.rect(col, row, 1, 1).fill(base);

    if (def.id === "brick") {
      // Vữa giữa các viên gạch: 3 hàng, so le
      for (let i = 1; i < 3; i++) g.moveTo(col, row + i / 3).lineTo(col + 1, row + i / 3);
      for (let i = 0; i < 3; i++) {
        const x = col + (i % 2 === 0 ? 0.5 : 0.25);
        g.moveTo(x, row + i / 3).lineTo(x, row + (i + 1) / 3);
      }
      g.stroke({ width: 0.04, color: shade(base, 0.5) });

      // Vẽ vết rạn nứt nếu tường gạch đã bị mất máu
      if (def.hp !== undefined) {
        const curHp = this.map.tileHp(col, row);
        if (curHp < def.hp) {
          const cracks = def.hp - curHp;
          g.moveTo(col + 0.2, row + 0.2)
            .lineTo(col + 0.45, row + 0.5)
            .lineTo(col + 0.8, row + 0.75);
          if (cracks >= 2) {
            g.moveTo(col + 0.75, row + 0.25)
              .lineTo(col + 0.5, row + 0.6)
              .lineTo(col + 0.25, row + 0.85);
          }
          g.stroke({ width: 0.05, color: 0x1a0f0a });
        }
      }
    } else {
      // Tường thép: mặt trong sáng hơn để nhìn ra khối
      g.rect(col + 0.1, row + 0.1, 0.8, 0.8).fill(shade(base, 1.25)).stroke({ width: 0.04, color: shade(base, 0.6) });
    }
  }

  private drawBush(def: TileDef, col: number, row: number): void {
    const g = this.bushLayer;
    const base = parseColor(def.color, 0x2e7d32);
    g.roundRect(col + 0.04, row + 0.04, 0.92, 0.92, 0.28).fill({ color: base, alpha: 0.75 });

    // Vài đốm sáng hơn, vị trí suy ra từ tọa độ ô nên mỗi lần vẽ đều giống nhau
    const h = ((col * 73856093) ^ (row * 19349663)) >>> 0;
    for (let i = 0; i < 3; i++) {
      const fx = 0.2 + (((h >> (i * 5)) & 31) / 31) * 0.6;
      const fy = 0.2 + (((h >> (i * 5 + 3)) & 31) / 31) * 0.6;
      g.circle(col + fx, row + fy, 0.12).fill({ color: shade(base, 1.5), alpha: 0.6 });
    }
  }

  private drawDebug(snapshot: Snapshot): void {
    const g = this.debugLayer;
    g.clear();
    if (!this.debug) return;

    for (const tank of snapshot.tanks) {
      const view = this.views.get(tank.id);
      if (!view) continue;
      const { x, y } = view.root.position;
      g.circle(x, y, tank.radius).stroke({ width: 0.04, color: 0xffeb3b });
      // Hướng thân (cam) và hướng tháp pháo (xanh lá), cùng gốc tại tâm xe
      g.moveTo(x, y).lineTo(
        x + Math.cos(view.hull.rotation) * tank.radius * 1.6,
        y + Math.sin(view.hull.rotation) * tank.radius * 1.6,
      );
      g.stroke({ width: 0.05, color: 0xff9800 });
      g.moveTo(x, y).lineTo(
        x + Math.cos(view.turret.rotation) * tank.radius * 2.4,
        y + Math.sin(view.turret.rotation) * tank.radius * 2.4,
      );
      g.stroke({ width: 0.05, color: 0x66bb6a });
    }

    // Hitbox đạn
    for (const p of snapshot.projectiles) {
      g.circle(p.x, p.y, p.radius).stroke({ width: 0.03, color: 0x00e5ff });
    }
  }
}
