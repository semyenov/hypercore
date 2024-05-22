import { CompactNode } from "./messages";
import Core from "./core";

export interface Corrections {
  tree: number;
  blocks: number;
}

async function auditCore(core: Core): Promise<Corrections>;
export = auditCore;
