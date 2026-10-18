import type {
  Controller,
  Health,
  Hull,
  Mobility,
  Projectile,
  TankInfo,
  Transform,
  Turret,
  Weapon,
} from "./components";

export type EntityId = number;

/** Kho lưu một loại component. Map giữ thứ tự chèn nên việc duyệt luôn xác định. */
export class ComponentStore<T> {
  private readonly map = new Map<EntityId, T>();

  set(id: EntityId, value: T): void {
    this.map.set(id, value);
  }

  get(id: EntityId): T | undefined {
    return this.map.get(id);
  }

  has(id: EntityId): boolean {
    return this.map.has(id);
  }

  delete(id: EntityId): void {
    this.map.delete(id);
  }

  entries(): IterableIterator<[EntityId, T]> {
    return this.map.entries();
  }

  get size(): number {
    return this.map.size;
  }
}

/** Toàn bộ trạng thái có thể thay đổi của trận đấu nằm trong World. */
export class World {
  private nextId: EntityId = 1;
  /** Các entity còn sống, theo thứ tự tạo. */
  readonly entities: EntityId[] = [];

  readonly transform = new ComponentStore<Transform>();
  readonly hull = new ComponentStore<Hull>();
  readonly turret = new ComponentStore<Turret>();
  readonly mobility = new ComponentStore<Mobility>();
  readonly controller = new ComponentStore<Controller>();
  readonly tankInfo = new ComponentStore<TankInfo>();
  readonly health = new ComponentStore<Health>();
  readonly weapon = new ComponentStore<Weapon>();
  readonly projectile = new ComponentStore<Projectile>();

  createEntity(): EntityId {
    const id = this.nextId++;
    this.entities.push(id);
    return id;
  }

  destroyEntity(id: EntityId): void {
    const index = this.entities.indexOf(id);
    if (index >= 0) this.entities.splice(index, 1);
    this.transform.delete(id);
    this.hull.delete(id);
    this.turret.delete(id);
    this.mobility.delete(id);
    this.controller.delete(id);
    this.tankInfo.delete(id);
    this.health.delete(id);
    this.weapon.delete(id);
    this.projectile.delete(id);
  }
}
