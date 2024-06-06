import b4a from "b4a";
import RAF from "random-access-file";
import Oplog from "../lib/oplog";
import * as c from "compact-encoding";
import Hypercore from "..";
import detectTypesTest from "../test/helpers/tst";
import { rmdir } from "fs/promises";

async function testStorage() {
  const filePath = './tests'
  await rmdir(filePath, { recursive: true })

  const hypercore = new Hypercore(filePath)
  await hypercore.ready()

  console.log(hypercore.discoveryKey)

  const info = await hypercore.append(b4a.from('hello'))
  console.log(info)

  const data = await hypercore.get(0)
  console.log(data)
}

testStorage()
