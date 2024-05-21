declare module "info" {
  export interface InfoOptions {
    key?: string;
    discoveryKey?: string;
    length?: number;
    contiguousLength?: number;
    byteLength?: number;
    fork?: number;
    padding?: number;
    storage?: any;
  }

  export interface StorageInfo {
    oplog: number;
    tree: number;
    blocks: number;
    bitfield: number;
  }

  export default class Info {
    constructor(opts?: InfoOptions);

    key: string;
    discoveryKey: string;
    length: number;
    contiguousLength: number;
    byteLength: number;
    fork: number;
    padding: number;
    storage: StorageInfo | null;

    static from(session: any, opts?: InfoOptions): Promise<Info>;
    static storage(session: any): Promise<StorageInfo | null>;
    static bytesUsed(file: any): Promise<number>;
  }
}
