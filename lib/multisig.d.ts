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

export function assemblev0(inputs: m.MultisigInput[]): Buffer;
export function assemble(inputs: m.MultisigInput[]): Buffer;
export function inflatev0(data: Buffer): m.MultiSignatureV0;
export function inflate(data: Buffer): m.MultiSignature;
export function partialSignature(
  tree: MerkleTree,
  signer: number,
  from: number,
  to?: number,
  signature?: Buffer,
): Promise<PartialSignatureResult | null>;
export function upgradeNodes(
  tree: MerkleTree,
  from: number,
  to: number,
): Promise<UpgradeNodesResult>;

export function signableLength(lengths: number[], quorum: number): number;

type PartialSignatureResult = {
  signer: number;
  signature: Buffer;
  patch: number;
  nodes?: m.CompactNode[];
};

function cmp(a: number, b: number): number;