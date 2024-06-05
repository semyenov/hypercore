declare class Mutex {
  locked: boolean;
  destroyed: boolean;

  constructor();

  lock(): Promise<void>;
  unlock(): void;
  destroy(err?: Error): Promise<void>;
}

export = Mutex;
