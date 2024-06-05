// lib/receiver-queue.d.ts

import FIFO from "fast-fifo";
import RandomAccessStorage from "./random-access-storage";
import { Request } from "hypercore/lib/messages";

declare class ReceiverQueue {
  queue: FIFO<Request>[];
  priority: Request[];
  requests: Map<string, Request>;
  length: number;

  constructor();

  push(req: Request): void;
  shift(): Request | null;
  delete(id: string): void;
}

export = ReceiverQueue;
