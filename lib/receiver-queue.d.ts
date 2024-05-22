// ./lib/receiver-queue.d.ts

declare module "hypercore/lib/receiver-queue" {
  import FIFO from "fast-fifo";
  import RandomAccessStorage from "./random-access-storage";
  import { Request } from "hypercore/lib/messages";

  export = class ReceiverQueue {
    private queue: FIFO<Request>[];
    private priority: Request[];
    private requests: Map<string, Request>;
    private length: number;

    constructor();

    push(req: Request): void;
    shift(): Request | null;
    delete(id: string): void;
  };
}
