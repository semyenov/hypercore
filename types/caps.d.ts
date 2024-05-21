declare module "./lib/caps" {
  const MANIFEST: Buffer;
  const DEFAULT_NAMESPACE: Buffer;
  const BLOCK_ENCRYPTION: Buffer;

  function replicate(
    isInitiator: boolean,
    key: Buffer,
    handshakeHash?: Buffer
  ): Buffer;

  function treeSignable(
    manifestHash: Buffer,
    treeHash: Buffer,
    length: number | bigint,
    fork: number | bigint
  ): Buffer;

  function treeSignableCompat(
    hash: Buffer,
    length: number | bigint,
    fork: number | bigint,
    noHeader?: boolean
  ): Buffer;
}
