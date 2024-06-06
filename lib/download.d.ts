import { AttachableRequest } from "./replicator";

declare class Download {
  constructor(req: Promise<AttachableRequest>);

  done(): Promise<void>;

  /**
   * Deprecated. Use `range.done()`.
   */
  downloaded(): Promise<void>;
  destroy(): void;
}

export = Download;
