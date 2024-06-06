// lib/core.d.ts

import { Buffer } from "buffer";
import hypercoreCrypto from "hypercore-crypto";
import Hypertrace from "hypertrace";
import RandomAccessStorage from "random-access-storage";
import Oplog from "./oplog";
import BigHeader from "./big-header";
import MerkleTree, { MerkleTreeBatch } from "./merkle-tree";
import BlockStore from "./block-store";
import Bitfield from "./bitfield";
import RemoteBitfield from "./remote-bitfield";
import Verifier from "./verifier";
import * as m from "./messages";
import { Corrections } from "./audit";

declare class Core {
  tracer: Hypertrace | null;
  onupdate: (
    status: number,
    bitfield: Bitfield | null,
    value: Buffer | null,
    from: number,
  ) => void;
  onconflict: (proof: m.Data) => Promise<void>;
  preupdate: ((batch: MerkleTreeBatch, key: Buffer) => Promise<void>) | null;
  header: m.OplogHeader;
  compat: boolean;
  crypto: typeof hypercoreCrypto;
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

  constructor(
    header: m.OplogHeader,
    compat: boolean,
    crypto: typeof hypercoreCrypto,
    oplog: Oplog,
    bigHeader: BigHeader,
    tree: MerkleTree,
    blocks: BlockStore,
    bitfield: Bitfield,
    verifier: Verifier | null,
    legacy: boolean,
    onupdate: (
      status: number,
      bitfield: Bitfield | null,
      value: Buffer | null,
      from: number,
    ) => void,
    onconflict: (proof: m.Data) => Promise<void>,
  );

  static open(
    storage: (name: string) => RandomAccessStorage,
    opts?: any,
  ): Promise<Core>;

  static resume(
    oplogFile: any,
    treeFile: any,
    bitfieldFile: any,
    dataFile: any,
    headerFile: any,
    opts: any,
  ): Promise<Core>;

  audit(): Promise<auditCore.Corrections>;
  setManifest(manifest: m.Manifest): Promise<void>;
  copyPrologue(src: Core, options?: { additional?: Buffer[] }): Promise<void>;
  flush(): Promise<void>;
  userData(key: string, value: Buffer, flush?: boolean): Promise<void>;
  truncate(
    length: number,
    fork: number,
    options?: { signature?: Buffer; keyPair?: KeyPair },
  ): Promise<void>;
  clearBatch(): Promise<void>;
  clear(start: number, end: number, cleared?: any): Promise<void>;
  purge(): Promise<void>;
  insertBatch(
    batch: MerkleTreeBatch,
    values: Buffer[],
    options?: {
      signature?: Buffer;
      keyPair?: KeyPair;
      pending?: boolean;
      treeLength?: number;
    },
  ): Promise<{ length: number; byteLength: number } | null>;
  append(
    values: Buffer[],
    options?: {
      signature?: Buffer;
      keyPair?: KeyPair;
      preappend?: (values: Buffer[]) => Promise<void>;
    },
  ): Promise<{ length: number; byteLength: number }>;
  checkConflict(proof: m.Data, from: number): Promise<boolean>;
  verifyReorg(proof: m.Data): Promise<m.TreeUpgrade>;
  verify(proof: m.Data, from?: number): Promise<boolean>;
  reorg(batch: MerkleTreeBatch, from: number): Promise<boolean>;
  openSkipBitfield(): RemoteBitfield;
  close(): Promise<void>;
}

function updateContig(
  header: m.OplogHeader,
  upd: Bitfield,
  bitfield: Bitfield,
): number;

function addReorgHint(
  list: ReorgHint[],
  tree: MerkleTree,
  batch: MerkleTreeBatch,
): void;

function updateUserData(
  list: KeyValue[],
  key: string,
  value: Buffer | null,
): void;

function closeAll(...storages: any[]): Promise<void>;

function flushHeader(
  oplog: Oplog,
  bigHeader: BigHeader,
  header: m.OplogHeader,
): Promise<void>;

function noop(): void;

function maximumSegmentStart(
  start: number,
  src: Bitfield,
  dst: Bitfield,
): number;

function minimumSegmentEnd(start: number, src: Bitfield, dst: Bitfield): number;

export = Core;
