// types/xache.d.ts

declare module "xache" {
  export interface MaxCacheOptions<K, V> {
    maxSize: number;
    maxAge: number;
    createMap?: () => Map<K, V>;
    ongc?: (oldest: Map<K, V>) => void;
  }

  class MaxCache<K, V> {
    constructor(options: MaxCacheOptions);

    [Symbol.iterator](): IterableIterator<[L, V]>;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;

    destroy(): void;
    clear(): void;
    set(k: K, v: V): this;
    retain(k: K, v: V): this;
    delete(k: K): boolean;
    has(k: K): boolean;
    get(k: K): V | null;
  }

  export = MaxCache;
}
