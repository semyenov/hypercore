declare module "hypercore/lib/mutex" {
  export default class Mutex {
    locked: boolean;
    destroyed: boolean;

    constructor();

    lock(): Promise<void>;
    unlock(): void;
    destroy(err?: Error): Promise<void>;
  }
}
