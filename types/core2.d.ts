declare module "./lib/core" {
  export default class Core {
    tracer: any;
    onupdate: any;
    onconflict: any;
    preupdate: any;
    header: any;
    compat: boolean;
    crypto: any;
    oplog: Oplog;
    bigHeader: BigHeader;
    tree: MerkleTree;
    blocks: BlockStore;
    bitfield: Bitfield;
    verifier: Verifier | null;
    truncating: number;
    updating: boolean;
    closed: boolean;
    skipBitfield: RemoteBitfield | null;
    active: number;
    sessions: any[];

    static open(storage: Function, opts?: any): Promise<Core>;
    static resume(
      oplogFile: any,
      treeFile: any,
      bitfieldFile: any,
      dataFile: any,
      headerFile: any,
      opts: any
    ): Promise<Core>;

    audit(): Promise<AuditResult>;
    setManifest(manifest: any): Promise<void>;

    copyPrologue(src: Core, opts?: { additional?: any[] }): Promise<void>;
    flush(): Promise<void>;

    userData(key: any, value: any, flush?: boolean): Promise<void>;
    truncate(
      length: number,
      fork: number,
      opts?: { signature?: any; keyPair?: any }
    ): Promise<void>;

    clearBatch(): Promise<void>;
    clear(start: number, end: number, cleared?: any): Promise<void>;
    purge(): Promise<void>;

    insertBatch(
      batch: any,
      values: any[],
      opts?: {
        signature?: any;
        keyPair?: any;
        pending?: boolean;
        treeLength?: number;
      }
    ): Promise<{ length: number; byteLength: number } | null>;
    append(
      values: any[],
      opts?: { signature?: any; keyPair?: any; preappend?: Function }
    ): Promise<{ length: number; byteLength: number }>;

    verifyReorg(proof: any): Promise<any>;
    verify(proof: any, from: any): Promise<boolean>;
    reorg(batch: any, from: any): Promise<boolean>;

    openSkipBitfield(): RemoteBitfield;
    close(): Promise<void>;
  }
}
