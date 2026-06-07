export class Pool<T extends { active: boolean; reset(): void }> {
  private items: T[] = [];
  private factory: () => T;

  constructor(factory: () => T, preAllocate = 0) {
    this.factory = factory;
    for (let i = 0; i < preAllocate; i++) {
      const item = factory();
      item.active = false;
      this.items.push(item);
    }
  }

  acquire(): T {
    const free = this.items.find((i) => !i.active);
    if (free) {
      free.active = true;
      free.reset();
      return free;
    }
    const item = this.factory();
    item.active = true;
    this.items.push(item);
    return item;
  }

  release(item: T): void {
    item.active = false;
  }

  get active(): T[] {
    return this.items.filter((i) => i.active);
  }

  get all(): T[] {
    return this.items;
  }

  clear(): void {
    this.items.length = 0;
  }
}
