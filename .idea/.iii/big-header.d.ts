declare module "hypercore/lib/big-header" {
  import RandomAccessStorage from "random-access-storage";
  import * as m from "hypercore/lib/messages";

  export default class BigHeader {
    constructor(storage: RandomAccessStorage);

    load(external: m.ExternalHeader): Promise<m.OplogHeader>;
    flush(header: m.OplogHeader): Promise<m.OplogHeader>;
    close(): Promise<void>;
  }
}
