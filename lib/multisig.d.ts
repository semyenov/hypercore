// lib/multisig.d.ts

import { Buffer } from "buffer";
import {
  CompactNode,
  MultisigInput,
  MultiSignature,
  MultiSignatureV0,
} from "hypercore/lib/messages";
import MerkleTree from "hypercore/lib/merkle-tree";

interface SignatureProof {
  signer: number;
  signature: Buffer;
  patch: number;
  nodes?: CompactNode[];
}

interface MultiSignatureMessage {
  proofs: SignatureProof[];
  patch: CompactNode[];
}

interface UpgradeNodesResult {
  nodes: CompactNode[];
}

export = class Multisig {
  static assemblev0(inputs: MultisigInput[]): Buffer;
  static assemble(inputs: MultisigInput[]): Buffer;
  static inflatev0(data: Buffer): MultiSignatureV0;
  static inflate(data: Buffer): MultiSignature;
  static partialSignature(
    tree: MerkleTree,
    signer: number,
    from: number,
    to?: number,
    signature?: Buffer
  ): PartialSignatureResult | null;
  static upgradeNodes(
    tree: MerkleTree,
    from: number,
    to: number
  ): Promise<UpgradeNodesResult>;

  static signableLength(lengths: number[], quorum: number): number;
};

type PartialSignatureResult = {
  signer: number;
  signature: Buffer;
  patch: number;
  nodes?: CompactNode[];
};

function cmp(a: number, b: number): number;
