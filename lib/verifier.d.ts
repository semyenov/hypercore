import { Buffer } from "buffer";
import { MerkleTreeBatch } from "hypercore/lib/merkle-tree";
import * as m from "hypercore/lib/messages";
import hypercoreCrypto from "hypercore-crypto";

enum BAD_ARGUMENT {
  PUBLIC_KEY_REQUIRED = "public key is required for a signer",
  ONLY_ED25519_SUPPORTED = "Only Ed25519 signatures are supported",
}

type Signature = Buffer;

interface SignerOptions {
  signature?: string;
  publicKey: Buffer;
  namespace?: Buffer;
}

export class Signer {
  crypto: typeof hypercoreCrypto;
  manifestHash: Buffer | null;
  version: number;
  signer: number;
  signature: string;
  publicKey: Buffer;
  namespace: Buffer;

  constructor(
    crypto: typeof hypercoreCrypto,
    manifestHash: Buffer | null,
    version: number,
    index: number,
    options: SignerOptions
  );

  verify(batch: MerkleTreeBatch, signature: Signature): boolean;
  sign(batch: MerkleTreeBatch, keyPair: m.KeyPair): Signature;
}

export class CompatSigner extends Signer {
  legacy: boolean;
  constructor(
    crypto: typeof hypercoreCrypto,
    index: number,
    signer: SignerType,
    legacy: boolean
  );

  verify(batch: MerkleTreeBatch, signature: Signature): boolean;
  sign(batch: MerkleTreeBatch, keyPair: m.KeyPair): Signature;
}

interface VerifierOptions {
  compat?: boolean;
  crypto?: typeof hypercoreCrypto;
  legacy?: boolean;
}

declare class Verifier {
  manifestHash: Buffer;
  compat: boolean;
  version: number;
  hash: string;
  allowPatch: boolean;
  quorum: number;
  signers: Signer[];
  prologue: Buffer | null;
  constructor(
    manifestHash: Buffer,
    manifest: m.Manifest,
    options?: VerifierOptions
  );

  verify(batch: MerkleTreeBatch[], signature?: Signature): boolean;
  sign(batch: MerkleTreeBatch[], keyPair: m.KeyPair): Promise<Signature>;
  assemble(inputs: (MultisigInput | MultisigInputV0)[]): Signature;

  static manifestHash(manifest: m.Manifest): Buffer;
  static defaultSignerManifest(publicKey: Buffer): m.Manifest;
  static fromManifest(manifest: m.Manifest, opts?: VerifierOptions): Verifier;
  static createManifest(inp: m.Manifest): m.Manifest;
  static isValidManifest(key: Buffer, manifest: m.Manifest): boolean;
  static isCompat(key: Buffer, manifest: m.Manifest): boolean;
  static sign(
    manifest: m.Manifest,
    batch: MerkleTreeBatch[],
    keyPair: m.KeyPair,
    opts?: VerifierOptions
  ): Signature;
}

export = Verifier;
