// types/hypercore-errors.d.ts

declare module "hypercore-errors" {
  export = class HypercoreError extends Error {
    constructor(message?: string, code?: string, fn?: typeof HypercoreError);

    readonly code: string;
    readonly name: string;
  };

  export function ASSERTION(message?: string): HypercoreError;
  export function BAD_ARGUMENT(message?: string): HypercoreError;
  export function STORAGE_EMPTY(message?: string): HypercoreError;
  export function STORAGE_CONFLICT(message?: string): HypercoreError;
  export function INVALID_SIGNATURE(message?: string): HypercoreError;
  export function INVALID_CAPABILITY(message?: string): HypercoreError;
  export function INVALID_CHECKSUM(message?: string): HypercoreError;
  export function INVALID_OPERATION(message?: string): HypercoreError;
  export function INVALID_PROOF(message?: string): HypercoreError;
  export function BLOCK_NOT_AVAILABLE(message?: string): HypercoreError;
  export function SNAPSHOT_NOT_AVAILABLE(message?: string): HypercoreError;
  export function REQUEST_CANCELLED(message?: string): HypercoreError;
  export function REQUEST_TIMEOUT(message?: string): HypercoreError;
  export function SESSION_NOT_WRITABLE(message?: string): HypercoreError;
  export function SESSION_CLOSED(message?: string): HypercoreError;
  export function BATCH_UNFLUSHED(message?: string): HypercoreError;
  export function BATCH_ALREADY_EXISTS(message?: string): HypercoreError;
  export function BATCH_ALREADY_FLUSHED(message?: string): HypercoreError;
  export function OPLOG_CORRUPT(message?: string): HypercoreError;
  export function OPLOG_HEADER_OVERFLOW(message?: string): HypercoreError;
  export function INVALID_OPLOG_VERSION(message?: string): HypercoreError;
  export function WRITE_FAILED(message?: string): HypercoreError;
}
