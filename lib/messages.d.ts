// lib/messages.d.ts

import { Buffer } from "buffer";
import { Codec, State } from "compact-encoding";

export interface Signer {
  signature: string;
  namespace: Buffer;
  publicKey: Buffer;
}

export interface Prologue {
  hash: Buffer;
  length: number;
}

export interface ManifestV0 {
  version: 0;
  hash: string;
  allowPatch: boolean;
  quorum: number;
  signers: Signer[];
  prologue: Prologue | null;
}

export interface ManifestV1 {
  version: 1;
  hash: string;
  allowPatch: boolean;
  quorum: number;
  signers: Signer[];
  prologue: Prologue | null;
}

export type Manifest = ManifestV0 | ManifestV1;

export interface CompactNode {
  index: number;
  size: number;
  hash: Buffer;
}

export interface Handshake {
  seeks: boolean;
  capability: Buffer;
}

export interface RequestBlock {
  index: number;
  nodes: number;
}

export interface RequestHash {
  index: number;
  nodes: number;
}

export interface RequestSeek {
  bytes: number;
  padding: number;
}

export interface RequestUpgrade {
  start: number;
  length: number;
}

export interface Request {
  id: number;
  fork: number;
  block?: RequestBlock;
  hash?: RequestHash;
  seek?: RequestSeek;
  upgrade?: RequestUpgrade;
  manifest: boolean;
  priority: number;
}

export interface Cancel {
  request: number;
}

export interface DataUpgrade {
  start: number;
  length: number;
  nodes: CompactNode[];
  additionalNodes: CompactNode[];
  signature: Buffer;
}

export interface DataSeek {
  bytes: number;
  nodes: CompactNode[];
}

export interface DataBlock {
  index: number;
  value: Buffer;
  nodes: CompactNode[];
}

export interface DataHash {
  index: number;
  nodes: CompactNode[];
}

export interface Data {
  request: number;
  fork: number;
  block?: DataBlock;
  hash?: DataHash;
  seek?: DataSeek;
  upgrade?: DataUpgrade;
  manifest?: Manifest;
}

export interface NoData {
  request: number;
}

export interface Want {
  start: number;
  length: number;
}

export interface Unwant {
  start: number;
  length: number;
}

export interface Range {
  drop: boolean;
  start: number;
  length: number;
}

export interface Bitfield {
  start: number;
  bitfield: Uint32Array;
}

export interface Sync {
  fork: number;
  length: number;
  remoteLength: number;
  canUpgrade: boolean;
  uploading: boolean;
  downloading: boolean;
  hasManifest: boolean;
}

export interface ReorgHint {
  from: number;
  to: number;
  ancestors: number;
}

export interface Extension {
  name: string;
  message: Buffer;
}

export interface KeyValue {
  key: string;
  value: Buffer;
}

export interface TreeUpgrade {
  fork: number;
  ancestors: number;
  length: number;
  signature: Buffer;
}

export interface BitfieldUpdate {
  drop: boolean;
  start: number;
  length: number;
}

export interface OplogEntry {
  userData?: KeyValue;
  treeNodes?: CompactNode[];
  treeUpgrade?: TreeUpgrade;
  bitfield?: BitfieldUpdate;
}

export interface KeyPair {
  publicKey: Buffer;
  secretKey: Buffer;
}

export interface Hints {
  reorgs: ReorgHint[];
  contiguousLength: number;
}

export interface TreeHeader {
  fork: number;
  length: number;
  rootHash: Buffer;
  signature: Buffer;
}

export interface Types {
  tree: string;
  bitfield: string;
  signer: string;
}

export interface ExternalHeader {
  start: number;
  length: number;
}

export interface OplogHeader {
  external?: ExternalHeader;
  key?: Buffer;
  manifest?: Manifest;
  keyPair?: KeyPair;
  userData: KeyValue[];
  tree: TreeHeader;
  hints: Hints;
}

export interface MultisigInput {
  signer: number;
  signature: Buffer;
  patch: number;
}

export interface MultisigInputV0 extends MultisigInput {
  patch?: PatchEncodingV0;
}

export interface PatchEncodingV0 {
  start: number;
  length: number;
  nodes: number[];
}

export interface MultiSignature {
  proofs: MultisigInput[];
  patch: CompactNode[];
}

export interface MultiSignatureV0 extends MultiSignature {
  proofs: MultisigInputV0[];
}

export const hashes: Codec<string, "blake2b">;
export const signatures: Codec<string, "ed25519">;
export const signer: Codec<Signer>;
export const signerArray: Codec<Signer[]>;
export const prologue: Codec<Prologue>;
export const manifest: Codec<Manifest>;
export const node: Codec<CompactNode>;
export const nodeArray: Codec<CompactNode[]>;
export const wire: {
  handshake: Codec<Handshake>;
  request: Codec<Request>;
  cancel: Codec<Cancel>;
  data: Codec<Data>;
  noData: Codec<NoData>;
  want: Codec<Want>;
  unwant: Codec<Unwant>;
  range: Codec<Range>;
  bitfield: Codec<Bitfield>;
  sync: Codec<Sync>;
  reorgHint: Codec<ReorgHint>;
  extension: Codec<Extension>;
};
export const oplog: {
  entry: Codec<OplogEntry>;
  header: Codec<OplogHeader>;
};
export const keyValue: Codec<KeyValue>;
export const treeUpgrade: Codec<TreeUpgrade>;
export const keyPair: Codec<KeyPair>;
export const reorgHintArray: Codec<ReorgHint[]>;
export const hints: Codec<Hints>;
export const treeHeader: Codec<TreeHeader>;
export const types: Codec<Types>;
export const externalHeader: Codec<ExternalHeader>;
export const keyValueArray: Codec<KeyValue[]>;
export const uintArray: Codec<number[]>;
export const multisigInput: Codec<MultisigInput>;
export const multisigInputV0: Codec<MultisigInputV0>;
export const multisigInputArrayV0: Codec<MultisigInputV0[]>;
export const multisigInputArray: Codec<MultisigInput[]>;
export const compactNode: Codec<CompactNode>;
export const compactNodeArray: Codec<CompactNode[]>;
export const multiSignaturev0: Codec<MultiSignatureV0>;
export const multiSignature: Codec<MultiSignature>;
