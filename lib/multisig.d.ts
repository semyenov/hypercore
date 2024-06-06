// lib/multisig.d.ts

import { Buffer } from "buffer";
import * as m from "./messages";
import MerkleTree from "./merkle-tree";

interface SignatureProof {
  signer: number;
  signature: Buffer;
  patch: number;
  nodes?: m.CompactNode[];
}

interface MultiSignatureMessage {
  proofs: SignatureProof[];
  patch: m.CompactNode[];
}

interface UpgradeNodesResult {
  nodes: m.CompactNode[];
}

declare class Multisig {
  static assemblev0(inputs: m.MultisigInput[]): Buffer;
  static assemble(inputs: m.MultisigInput[]): Buffer;
  static inflatev0(data: Buffer): m.MultiSignatureV0;
  static inflate(data: Buffer): m.MultiSignature;
  static partialSignature(
    tree: MerkleTree,
    signer: number,
    from: number,
    to?: number,
    signature?: Buffer,
  ): Promise<PartialSignatureResult | null>;
  static upgradeNodes(
    tree: MerkleTree,
    from: number,
    to: number,
  ): Promise<UpgradeNodesResult>;

  static signableLength(lengths: number[], quorum: number): number;
}

type PartialSignatureResult = {
  signer: number;
  signature: Buffer;
  patch: number;
  nodes?: m.CompactNode[];
};

function cmp(a: number, b: number): number;

export = Multisig;
