// peer.d.ts

import Protomux, { Channel } from "protomux";
import { Hypertrace } from "hypertrace";
import { Codec } from "compact-encoding";
import { Capability, HypercoreError } from "hypercore-errors";
import { ReceiverQueue } from "./receiver-queue";
import { RemoteBitfield } from "./remote-bitfield";
import * as m from "./messages";
import Protomux = require("protomux");
import Replicator = require("./replicator");

declare class Peer {
  tracer: Trace;
  core: any; // Consider replacing 'any' with a more specific type if available
  replicator: Replicator; // Consider replacing 'any' with a more specific type if available
  stream: any; // Consider replacing 'any' with a more specific type if available
  protomux: Protomux;
  channel: Channel; // Consider replacing 'any' with a more specific type if available
  remotePublicKey: Buffer;
  remoteSupportsSeeks: boolean;
  inflightRange: [number, number];
  paused: boolean;
  useSession: boolean;
  wireSync: Codec<m.Sync>;
  wireRequest: Codec<m.Request>;
  wireCancel: Codec<m.Cancel>;
  wireData: Codec<m.Data>;
  wireNoData: Codec<m.NoData>;
  wireWant: Codec<m.Want>;
  wireUnwant: Codec<m.Unwant>;
  wireBitfield: Codec<m.Bitfield>;
  wireRange: Codec<m.Range>;
  wireExtension: Codec<m.Extension>;
  receiverQueue: ReceiverQueue;
  receiverBusy: boolean;
  inflight: number;
  dataProcessing: number;
  canUpgrade: boolean;
  needsSync: boolean;
  syncsProcessing: number;
  remoteFork: number;
  remoteLength: number;
  remoteCanUpgrade: boolean;
  remoteUploading: boolean;
  remoteDownloading: boolean;
  remoteSynced: boolean;
  remoteHasManifest: boolean;
  segmentsWanted: Set<number>;
  broadcastedNonSparse: boolean;
  lengthAcked: number;
  extensions: Map<string, any>; // Consider replacing 'any' with a more specific type if available
  lastExtensionSent: string;
  lastExtensionRecv: string;
  remoteBitfield: RemoteBitfield;
  missingBlocks: RemoteBitfield;

  constructor(
    replicator: Replicator,
    protomux: Protomux,
    channel: Channel,
    useSession: boolean,
    inflightRange: [number, number]
  );

  get remoteContiguousLength(): number;

  broadcastRange(start: number, length: number, drop: boolean): void;
  extension(name: string, message: Buffer): void;
  onextension(msg: m.Extension): void;
  onopen(msg: m.Handshake): void;
  onsync(msg: m.Sync): Promise<void>;
  onrequest(msg: m.Request): Promise<void>;
  oncancel(msg: m.Cancel): void;
  ondata(msg: m.Data): Promise<void>;
  onnodata(msg: m.NoData): void;
  onwant(msg: m.Want): void;
  onbitfield(msg: m.Bitfield): void;
  onrange(msg: m.Range): void;
  onclose(isRemote: boolean): void;
  sendSync(): void;
  getMaxInflight(): number;
  signalUpgrade(): void;
  closeIfIdle(): boolean;
  onreorghint(): void;
  ondrain(): Promise<void>;
  onunwant(): void;
  isActive(): boolean;
}

export = Peer;
