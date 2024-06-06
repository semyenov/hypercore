import * as m from "./messages";
import Peer from "./peer";
import { ByteSeeker } from "./merkle-tree";
import Core from "./core";
import Protomux from "protomux";

declare const DEFAULT_MAX_INFLIGHT: [16, 512];
declare const NOT_DOWNLOADING_SLACK: number;
declare const PRIORITY: {
  NORMAL: 0;
  HIGH: 1;
  VERY_HIGH: 2;
};

declare interface AttachableRequest<T extends Attachable = Attachable> {
  context: T;
  session: AttachableRequest<T>[];
  sindex: number;
  rindex: number;
  snapshot: boolean;
  resolve: (val: any) => void;
  reject: (err: any) => void;
  promise: Promise<any>;
  timeout: NodeJS.Timeout | null;
}

class Attachable<T = any> {
  resolved: boolean;
  refs: AttachableRequest[];

  attach(session: AttachableRequest[]): AttachableRequest;
  detach(r: AttachableRequest, err?: any): boolean;
  gc(): void;
  resolve(val: T): void;
  reject(err: any): void;
  setTimeout(r: AttachableRequest, ms: number): void;
}

class BlockRequest extends Attachable {
  index: number;
  priority: number;
  inflight: AttachableRequest[];
  queued: boolean;
  tracker: InflightTracker;

  constructor(tracker: InflightTracker, index: number, priority: number);
}

class RangeRequest extends Attachable {
  start: number;
  end: number;
  linear: boolean;
  ifAvailable: boolean;
  blocks: number[];
  ranges: RangeRequest[];
  userStart: number;
  userEnd: number;

  constructor(
    ranges: RangeRequest[],
    start: number,
    end: number,
    linear: boolean,
    ifAvailable: boolean,
    blocks: number[]
  );
}

class UpgradeRequest extends Attachable {
  fork: number;
  length: number;
  inflight: Attachable[];
  replicator: Replicator;

  constructor(replicator: Replicator, fork: number, length: number);
}

class SeekRequest extends Attachable {
  seeker: ByteSeeker;
  inflight: AttachableRequest[];
  seeks: SeekRequest[];

  constructor(seeks: SeekRequest[], seeker: ByteSeeker);
}

class InflightTracker {
  constructor();

  get idle(): boolean;
  [Symbol.iterator](): IterableIterator<AttachableRequest>;

  add(req: AttachableRequest): AttachableRequest;
  get(id: number): AttachableRequest | null;
  remove(id: number): void;
}

class BlockTracker {
  constructor();

  [Symbol.iterator](): IterableIterator<BlockRequest>;

  isEmpty(): boolean;
  has(index: number): boolean;
  get(index: number): BlockRequest | null;
  add(index: number, priority: number): BlockRequest;
  remove(index: number): BlockRequest | null;
}

declare class Replicator {
  static Peer: typeof Peer;

  constructor(
    core: Core,
    key: Buffer,
    options?: {
      notDownloadingLinger?: number;
      eagerUpgrade?: boolean;
      allowFork?: boolean;
      inflightRange?: [number, number] | null;
      onpeerupdate?: (added: boolean, peer: Peer) => void;
      onupload?: () => void;
      oninvalid?: () => void;
    }
  );

  on(event: 'download', listener: (index: number) => void): this;
  on(event: 'upload', listener: (index: number) => void): this;
  on(event: 'close', listener: () => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'peer-add', listener: (peer: any) => void): this;
  on(event: 'peer-remove', listener: (peer: any) => void): this;
  on(event: 'update', listener: () => void): this;
  on(event: 'ready', listener: () => void): this;
  on(event: 'append', listener: () => void): this;
  on(event: 'verification-error', listener: (err: Error) => void): this;

  tracer: any;
  key: Buffer;
  discoveryKey: Buffer;
  core: Core;
  eagerUpgrade: boolean;
  allowFork: boolean;
  onpeerupdate: (added: boolean, peer: Peer) => void;
  onupload: () => void;
  oninvalid: () => void;
  ondownloading: (() => void) | null;
  peers: Peer[];
  findingPeers: number;
  destroyed: boolean;
  downloading: boolean;
  activeSessions: number;
  inflightRange: [number, number];

  updateActivity(inc: number, session: AttachableRequest[]): void;
  isDownloading(): boolean;
  setDownloading(downloading: boolean): void;
  setDownloadingNow(downloading: boolean): void;
  cork(): void;
  uncork(): void;
  onhave(start: number, length: number, drop?: boolean): void;
  ontruncate(newLength: number, truncated: any): void;
  onupgrade(): void;
  onconflict(from: any): Promise<void>;
  applyPendingReorg(): Promise<boolean>;
  addUpgrade(session: AttachableRequest[]): AttachableRequest<UpgradeRequest>;
  addBlock(session: AttachableRequest[], index: number): AttachableRequest<BlockRequest>;
  addSeek(session: AttachableRequest[], seeker: ByteSeeker): AttachableRequest<SeekRequest>;
  addRange(
    session: AttachableRequest[],
    options?: {
      start?: number;
      end?: number;
      length?: number;
      blocks?: number[] | null;
      linear?: boolean;
      ifAvailable?: boolean;
    }
  ): AttachableRequest<RangeRequest>;
  cancel(ref: AttachableRequest): void;
  clearRequests(session: AttachableRequest[], err?: any): void;
  updatePeer(peer: Peer): void;
  updateAll(): void;
  attached(protomux: Protomux): boolean;
  attachTo(protomux: Protomux, useSession: boolean): void;
  detachFrom(protomux: Protomux): void;
  destroy(): void;
}

export = Replicator;