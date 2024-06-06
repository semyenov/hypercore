import { Buffer } from "buffer";

export const MANIFEST: Buffer;
export const DEFAULT_NAMESPACE: Buffer;
export const BLOCK_ENCRYPTION: Buffer;

export function replicate(
  isInitiator: boolean,
  key: Buffer,
  handshakeHash?: Buffer,
): Buffer;

export function treeSignable(
  manifestHash: Buffer,
  treeHash: Buffer,
  length: number,
  fork: number,
): Buffer;

export function treeSignableCompat(
  hash: Buffer,
  length: number,
  fork: number,
  noHeader?: boolean,
): Buffer;
