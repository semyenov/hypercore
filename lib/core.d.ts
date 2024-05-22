// lib/core.d.ts

import { Buffer } from "buffer";
import hypercoreCrypto from "hypercore-crypto";
import {
  BAD_ARGUMENT,
  STORAGE_EMPTY,
  STORAGE_CONFLICT,
  INVALID_OPERATION,
  INVALID_SIGNATURE,
  INVALID_CHECKSUM,
} from "hypercore-errors";
import Hypertrace from "hypertrace";
import RandomAccessStorage from "random-access-storage";
import Oplog from "hypercore/lib/oplog";
import BigHeader from "hypercore/lib/big-header";
import MerkleTree from "hypercore/lib/merkle-tree";
import BlockStore from "hypercore/lib/block-store";
import Bitfield from "hypercore/lib/bitfield";
import RemoteBitfield from "hypercore/lib/remote-bitfield";
import Info, { StorageInfo } from "hypercore/lib/info";
import Verifier from "hypercore/lib/verifier";
import { OplogHeader, Manifest } from "hypercore/lib/messages";

export = class Core {
  tracer: Hypertrace | null;
  onupdate: (
    status: number,
    bitfield: Bitfield | null,
    value: Buffer | null,
    from: number
  ) => void;
  onconflict: (proof: Data) => Promise<void>;
  preupdate: ((batch: MerkleTreeBatch, key: Buffer) => Promise<void>) | null;
  header: OplogHeader;
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

  constructor(
    header: OplogHeader,
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
      from: number
    ) => void,
    onconflict: (proof: Data) => Promise<void>
  );

  static open(
    storage: (name: string) => RandomAccessStorage,
    opts?: any
  ): Promise<Core>;
  static resume(
    oplogFile: any,
    treeFile: any,
    bitfieldFile: any,
    dataFile: any,
    headerFile: any,
    opts: any
  ): Promise<Core>;

  audit(): Promise<Corrections>;
  setManifest(manifest: Manifest): Promise<void>;
  copyPrologue(src: Core, options?: { additional?: Buffer[] }): Promise<void>;
  flush(): Promise<void>;
  userData(key: string, value: Buffer, flush?: boolean): Promise<void>;
  truncate(
    length: number,
    fork: number,
    options?: { signature?: Buffer; keyPair?: KeyPair }
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
    }
  ): Promise<{ length: number; byteLength: number } | null>;
  append(
    values: Buffer[],
    options?: {
      signature?: Buffer;
      keyPair?: KeyPair;
      preappend?: (values: Buffer[]) => Promise<void>;
    }
  ): Promise<{ length: number; byteLength: number }>;
  checkConflict(proof: Data, from: number): Promise<boolean>;
  verifyReorg(proof: Data): Promise<ReorgBatch>;
  verify(proof: Data, from: number): Promise<boolean>;
  reorg(batch: MerkleTreeBatch, from: number): Promise<boolean>;
  openSkipBitfield(): RemoteBitfield;
  close(): Promise<void>;
};

function updateContig(
  header: OplogHeader,
  upd: Bitfield,
  bitfield: Bitfield
): number;

function addReorgHint(
  list: ReorgHint[],
  tree: MerkleTree,
  batch: MerkleTreeBatch
): void;

function updateUserData(
  list: KeyValue[],
  key: string,
  value: Buffer | null
): void;

function closeAll(...storages: any[]): Promise<void>;

function flushHeader(
  oplog: Oplog,
  bigHeader: BigHeader,
  header: OplogHeader
): Promise<void>;

function noop(): void;

function maximumSegmentStart(
  start: number,
  src: Bitfield,
  dst: Bitfield
): number;

function minimumSegmentEnd(start: number, src: Bitfield, dst: Bitfield): number;
