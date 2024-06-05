/* DEV DOCS
  Every hypercore has one Replicator object managing its connections to other peers.
  There is one Peer object per peer connected to the Hypercore.
  Hypercores do not know about other hypercores, so when a peer is connected to multiple cores, there exists one Peer object per core.

  Hypercore indicates block should be downloaded through methods like Replicator.addRange or Replicator.addBlock
  Hypercore calls Replicator.updateActivity every time a hypercore session opens/closes
  Replicator.updateActivity ensures the Hypercore is downloading blocks as expected
  Replicator keeps track of:
    - Which blocks need to be downloaded (Replicator._blocks)
    - Which blocks currently have inflight requests (Replicator._inflight)

  Blocks are requested from remote peers by Peer objects. The flow is:
    - The replicator's updatePeer method gets called
    - The replicator detects whether the Peer can accept more requests (for example by checking if it's maxed out on inflight blocks)
    - The replicator then tells the Peer what to request (e.g. Peer._requestRange or Peer._requestBlock methods)

  The Peer object is responsible for tracking
    - Which blocks does the Peer have available (tracked in remoteBitfield)
    - Which blocks are you actively looking for from this peer (tracked in missingBlocks)
    - How many blocks are currently inflight (tracked in inflight)
  The Peer uses this information to decide which blocks to request form the peer in response to _requestRange requests and the like.
*/

const safetyCatch = require('safety-catch')
const RandomIterator = require('random-array-iterator')

const { REQUEST_CANCELLED, REQUEST_TIMEOUT, SNAPSHOT_NOT_AVAILABLE } = require('hypercore-errors')
const m = require('./messages')
const caps = require('./caps')
const { createTracer } = require('hypertrace')
const Peer = require('./peer')

const DEFAULT_MAX_INFLIGHT = [16, 512]
const NOT_DOWNLOADING_SLACK = 20000 + (Math.random() * 20000) | 0

const PRIORITY = {
  NORMAL: 0,
  HIGH: 1,
  VERY_HIGH: 2
}

class Attachable {
  constructor () {
    this.resolved = false
    this.refs = []
  }

  attach (session) {
    const r = {
      context: this,
      session,
      sindex: 0,
      rindex: 0,
      snapshot: true,
      resolve: null,
      reject: null,
      promise: null,
      timeout: null
    }

    r.sindex = session.push(r) - 1
    r.rindex = this.refs.push(r) - 1
    r.promise = new Promise((resolve, reject) => {
      r.resolve = resolve
      r.reject = reject
    })

    return r
  }

  detach (r, err = null) {
    if (r.context !== this) return false

    this._detach(r)
    this._cancel(r, err)
    this.gc()

    return true
  }

  _detach (r) {
    const rh = this.refs.pop()
    const sh = r.session.pop()

    if (r.rindex < this.refs.length) this.refs[rh.rindex = r.rindex] = rh
    if (r.sindex < r.session.length) r.session[sh.sindex = r.sindex] = sh

    destroyRequestTimeout(r)
    r.context = null

    return r
  }

  gc () {
    if (this.refs.length === 0) this._unref()
  }

  _cancel (r, err) {
    r.reject(err || REQUEST_CANCELLED())
  }

  _unref () {
    // overwrite me
  }

  resolve (val) {
    this.resolved = true
    while (this.refs.length > 0) {
      this._detach(this.refs[this.refs.length - 1]).resolve(val)
    }
  }

  reject (err) {
    this.resolved = true
    while (this.refs.length > 0) {
      this._detach(this.refs[this.refs.length - 1]).reject(err)
    }
  }

  setTimeout (r, ms) {
    destroyRequestTimeout(r)
    r.timeout = setTimeout(onrequesttimeout, ms, r)
  }
}

class BlockRequest extends Attachable {
  constructor (tracker, index, priority) {
    super()

    this.index = index
    this.priority = priority
    this.inflight = []
    this.queued = false
    this.tracker = tracker
  }

  _unref () {
    for (const req of this.inflight) {
      req.peer._cancelRequest(req.id)
    }

    this.tracker.remove(this.index)
  }
}

class RangeRequest extends Attachable {
  constructor (ranges, start, end, linear, ifAvailable, blocks) {
    super()

    this.start = start
    this.end = end
    this.linear = linear
    this.ifAvailable = ifAvailable
    this.blocks = blocks
    this.ranges = ranges

    // As passed by the user, immut
    this.userStart = start
    this.userEnd = end
  }

  _unref () {
    const i = this.ranges.indexOf(this)
    if (i === -1) return
    const h = this.ranges.pop()
    if (i < this.ranges.length) this.ranges[i] = h
  }

  _cancel (r) {
    r.resolve(false)
  }
}

class UpgradeRequest extends Attachable {
  constructor (replicator, fork, length) {
    super()

    this.fork = fork
    this.length = length
    this.inflight = []
    this.replicator = replicator
  }

  _unref () {
    if (this.replicator.eagerUpgrade === true || this.inflight.length > 0) return
    this.replicator._upgrade = null
  }

  _cancel (r) {
    r.resolve(false)
  }
}

class SeekRequest extends Attachable {
  constructor (seeks, seeker) {
    super()

    this.seeker = seeker
    this.inflight = []
    this.seeks = seeks
  }

  _unref () {
    if (this.inflight.length > 0) return
    const i = this.seeks.indexOf(this)
    if (i === -1) return
    const h = this.seeks.pop()
    if (i < this.seeks.length) this.seeks[i] = h
  }
}

class InflightTracker {
  constructor () {
    this._requests = []
    this._free = []
  }

  get idle () {
    return this._requests.length === this._free.length
  }

  * [Symbol.iterator] () {
    for (const req of this._requests) {
      if (req !== null) yield req
    }
  }

  add (req) {
    const id = this._free.length ? this._free.pop() : this._requests.push(null)

    req.id = id
    this._requests[id - 1] = req
    return req
  }

  get (id) {
    return id <= this._requests.length ? this._requests[id - 1] : null
  }

  remove (id) {
    if (id <= this._requests.length) {
      const req = this._requests[id - 1]
      clearTimeout(req.timeout)
      req.timeout = null
      this._requests[id - 1] = null
      this._free.push(id)
    }
  }
}

class BlockTracker {
  constructor () {
    this._map = new Map()
  }

  [Symbol.iterator] () {
    return this._map.values()
  }

  isEmpty () {
    return this._map.size === 0
  }

  has (index) {
    return this._map.has(index)
  }

  get (index) {
    return this._map.get(index) || null
  }

  add (index, priority) {
    let b = this._map.get(index)
    if (b) return b

    b = new BlockRequest(this, index, priority)
    this._map.set(index, b)

    return b
  }

  remove (index) {
    const b = this.get(index)
    this._map.delete(index)
    return b
  }
}


module.exports = class Replicator {
  static Peer = Peer // hack to be able to access Peer from outside this module

  constructor (core, key, {
    notDownloadingLinger = NOT_DOWNLOADING_SLACK,
    eagerUpgrade = true,
    allowFork = true,
    inflightRange = null,
    onpeerupdate = noop,
    onupload = noop,
    oninvalid = noop
  } = {}) {
    this.tracer = createTracer(this)
    this.key = key
    this.discoveryKey = core.crypto.discoveryKey(key)
    this.core = core
    this.eagerUpgrade = eagerUpgrade
    this.allowFork = allowFork
    this.onpeerupdate = onpeerupdate
    this.onupload = onupload
    this.oninvalid = oninvalid
    this.ondownloading = null // optional external hook for monitoring downloading status
    this.peers = []
    this.findingPeers = 0 // updateable from the outside
    this.destroyed = false
    this.downloading = false
    this.activeSessions = 0

    this.inflightRange = inflightRange || DEFAULT_MAX_INFLIGHT

    this._attached = new Set()
    this._inflight = new InflightTracker()
    this._blocks = new BlockTracker()
    this._hashes = new BlockTracker()

    this._queued = []

    this._seeks = []
    this._upgrade = null
    this._reorgs = []
    this._ranges = []

    this._hadPeers = false
    this._ifAvailable = 0
    this._updatesPending = 0
    this._applyingReorg = null
    this._manifestPeer = null
    this._notDownloadingLinger = notDownloadingLinger
    this._downloadingTimer = null

    const self = this
    this._onstreamclose = onstreamclose

    function onstreamclose () {
      self.detachFrom(this.userData)
    }
  }

  updateActivity (inc, session) {
    this.activeSessions += inc
    this.setDownloading(this.activeSessions !== 0, session)
  }

  isDownloading () {
    return this.downloading || !this._inflight.idle
  }

  setDownloading (downloading) {
    clearTimeout(this._downloadingTimer)

    if (this.destroyed) return
    if (downloading || this._notDownloadingLinger === 0) {
      this.setDownloadingNow(downloading)
      return
    }

    this._downloadingTimer = setTimeout(setDownloadingLater, this._notDownloadingLinger, this, downloading)
  }

  setDownloadingNow (downloading) {
    this._downloadingTimer = null
    if (this.downloading === downloading) return
    this.downloading = downloading
    if (!downloading && this.isDownloading()) return

    for (const peer of this.peers) peer.signalUpgrade()

    if (downloading) { // restart channel if needed...
      for (const protomux of this._attached) {
        if (!protomux.stream.handshakeHash) continue
        if (protomux.opened({ protocol: 'hypercore/alpha', id: this.discoveryKey })) continue
        this._makePeer(protomux, true)
      }
    } else {
      for (const peer of this.peers) peer.closeIfIdle()
    }

    if (this.ondownloading !== null && downloading) this.ondownloading()
  }

  cork () {
    for (const peer of this.peers) peer.protomux.cork()
  }

  uncork () {
    for (const peer of this.peers) peer.protomux.uncork()
  }

  // Called externally when a range of new blocks has been processed/removed
  onhave (start, length, drop = false) {
    for (const peer of this.peers) peer.broadcastRange(start, length, drop)
  }

  // Called externally when a truncation upgrade has been processed
  ontruncate (newLength, truncated) {
    const notify = []

    for (const blk of this._blocks) {
      if (blk.index < newLength) continue
      notify.push(blk)
    }

    for (const blk of notify) {
      for (const r of blk.refs) {
        if (r.snapshot === false) continue
        blk.detach(r, SNAPSHOT_NOT_AVAILABLE())
      }
    }

    for (const peer of this.peers) peer._unclearLocalRange(newLength, truncated)
  }

  // Called externally when a upgrade has been processed
  onupgrade () {
    for (const peer of this.peers) peer.signalUpgrade()
    if (this._blocks.isEmpty() === false) this._resolveBlocksLocally()
    if (this._upgrade !== null) this._resolveUpgradeRequest(null)
    if (this._ranges.length !== 0 || this._seeks.length !== 0) this._updateNonPrimary(true)
  }

  // Called externally when a conflict has been detected and verified
  async onconflict (from) {
    const all = []
    for (const peer of this.peers) {
      all.push(peer._onconflict())
    }
    await Promise.allSettled(all)
  }

  async applyPendingReorg () {
    if (this._applyingReorg !== null) {
      await this._applyingReorg
      return true
    }

    for (let i = this._reorgs.length - 1; i >= 0; i--) {
      const f = this._reorgs[i]
      if (f.batch !== null && f.batch.finished) {
        await this._applyReorg(f)
        return true
      }
    }

    return false
  }

  addUpgrade (session) {
    if (this._upgrade !== null) {
      const ref = this._upgrade.attach(session)
      this._checkUpgradeIfAvailable()
      return ref
    }

    const ref = this._addUpgrade().attach(session)

    this.updateAll()

    return ref
  }

  addBlock (session, index) {
    const b = this._blocks.add(index, PRIORITY.HIGH)
    const ref = b.attach(session)

    this._queueBlock(b)
    this.updateAll()

    return ref
  }

  addSeek (session, seeker) {
    const s = new SeekRequest(this._seeks, seeker)
    const ref = s.attach(session)

    this._seeks.push(s)
    this.updateAll()

    return ref
  }

  addRange (session, { start = 0, end = -1, length = toLength(start, end), blocks = null, linear = false, ifAvailable = false } = {}) {
    if (blocks !== null) { // if using blocks, start, end just acts as frames around the blocks array
      start = 0
      end = length = blocks.length
    }

    const r = new RangeRequest(
      this._ranges,
      start,
      length === -1 ? -1 : start + length,
      linear,
      ifAvailable,
      blocks
    )

    const ref = r.attach(session)

    this._ranges.push(r)

    // Trigger this to see if this is already resolved...
    // Also auto compresses the range based on local bitfield
    this._updateNonPrimary(true)

    return ref
  }

  cancel (ref) {
    ref.context.detach(ref, null)
  }

  clearRequests (session, err = null) {
    let cleared = false
    while (session.length > 0) {
      const ref = session[session.length - 1]
      ref.context.detach(ref, err)
      cleared = true
    }

    if (cleared) this.updateAll()
  }

  _addUpgradeMaybe () {
    return this.eagerUpgrade === true ? this._addUpgrade() : this._upgrade
  }

  // TODO: this function is OVER called atm, at each updatePeer/updateAll
  // instead its more efficient to only call it when the conditions in here change - ie on sync/add/remove peer
  // Do this when we have more tests.
  _checkUpgradeIfAvailable () {
    if (this._ifAvailable > 0 || this._upgrade === null || this._upgrade.refs.length === 0) return
    if (this._hadPeers === false && this.findingPeers > 0) return

    // check if a peer can upgrade us

    for (let i = 0; i < this.peers.length; i++) {
      const peer = this.peers[i]

      if (peer.remoteSynced === false) return

      if (this.core.tree.length === 0 && peer.remoteLength > 0) return

      if (peer.remoteLength <= this._upgrade.length || peer.remoteFork !== this._upgrade.fork) continue

      if (peer.syncsProcessing > 0) return

      if (peer.lengthAcked !== this.core.tree.length && peer.remoteFork === this.core.tree.fork) return
      if (peer.remoteCanUpgrade === true) return
    }

    // check if reorgs in progress...

    if (this._applyingReorg !== null) return

    // TODO: we prob should NOT wait for inflight reorgs here, seems better to just resolve the upgrade
    // and then apply the reorg on the next call in case it's slow - needs some testing in practice

    for (let i = 0; i < this._reorgs.length; i++) {
      const r = this._reorgs[i]
      if (r.inflight.length > 0) return
    }

    // nothing to do, indicate no update avail

    const u = this._upgrade
    this._upgrade = null
    u.resolve(false)
  }

  _addUpgrade () {
    if (this._upgrade !== null) return this._upgrade

    // TODO: needs a reorg: true/false flag to indicate if the user requested a reorg
    this._upgrade = new UpgradeRequest(this, this.core.tree.fork, this.core.tree.length)

    return this._upgrade
  }

  _addReorg (fork, peer) {
    if (this.allowFork === false) return null

    // TODO: eager gc old reorgs from the same peer
    // not super important because they'll get gc'ed when the request finishes
    // but just spam the remote can do ...

    for (const f of this._reorgs) {
      if (f.fork > fork && f.batch !== null) return null
      if (f.fork === fork) return f
    }

    const f = {
      fork,
      inflight: [],
      batch: null
    }

    this._reorgs.push(f)

    // maintain sorted by fork
    let i = this._reorgs.length - 1
    while (i > 0 && this._reorgs[i - 1].fork > fork) {
      this._reorgs[i] = this._reorgs[i - 1]
      this._reorgs[--i] = f
    }

    return f
  }

  _shouldUpgrade (peer) {
    if (this._upgrade !== null && this._upgrade.inflight.length > 0) return false
    return peer.remoteCanUpgrade === true &&
      peer.remoteLength > this.core.tree.length &&
      peer.lengthAcked === this.core.tree.length
  }

  _autoUpgrade (peer) {
    return this._upgrade !== null && peer.remoteFork === this.core.tree.fork && this._shouldUpgrade(peer)
  }

  _addPeer (peer) {
    this._hadPeers = true
    this.peers.push(peer)
    this.updatePeer(peer)
    this.onpeerupdate(true, peer)
  }

  _removeInflight (id) {
    this._inflight.remove(id)
    if (this.isDownloading() === true) return
    for (const peer of this.peers) peer.signalUpgrade()
  }

  _removePeer (peer) {
    this.peers.splice(this.peers.indexOf(peer), 1)
    peer.removed = true

    if (this._manifestPeer === peer) this._manifestPeer = null

    for (const req of this._inflight) {
      if (req.peer !== peer) continue
      this._inflight.remove(req.id)
      this._clearRequest(peer, req)
    }

    this.onpeerupdate(false, peer)
    this.updateAll()
  }

  _queueBlock (b) {
    if (b.inflight.length > 0 || b.queued === true) return
    b.queued = true
    this._queued.push(b)
  }

  _resolveHashLocally (peer, req) {
    this._removeInflight(req.id)
    this._resolveBlockRequest(this._hashes, req.hash.index / 2, null, req)
    this.updatePeer(peer)
  }

  // Runs in the background - not allowed to throw
  async _resolveBlocksLocally () {
    // TODO: check if fork compat etc. Requires that we pass down truncation info

    let clear = null

    for (const b of this._blocks) {
      if (this.core.bitfield.get(b.index) === false) continue

      try {
        b.resolve(await this.core.blocks.get(b.index))
      } catch (err) {
        b.reject(err)
      }

      if (clear === null) clear = []
      clear.push(b)
    }

    if (clear === null) return

    // Currently the block tracker does not support deletes during iteration, so we make
    // sure to clear them afterwards.
    for (const b of clear) {
      this._blocks.remove(b.index)
    }
  }

  _resolveBlockRequest (tracker, index, value, req) {
    const b = tracker.remove(index)
    if (b === null) return false

    removeInflight(b.inflight, req)
    b.queued = false

    b.resolve(value)

    return true
  }

  _resolveUpgradeRequest (req) {
    if (req !== null) removeInflight(this._upgrade.inflight, req)

    if (this.core.tree.length === this._upgrade.length && this.core.tree.fork === this._upgrade.fork) return false

    const u = this._upgrade
    this._upgrade = null
    u.resolve(true)

    return true
  }

  _resolveRangeRequest (req, index) {
    const head = this._ranges.pop()

    if (index < this._ranges.length) this._ranges[index] = head

    req.resolve(true)
  }

  _clearInflightBlock (tracker, req) {
    const isBlock = tracker === this._blocks
    const index = isBlock === true ? req.block.index : req.hash.index / 2
    const b = tracker.get(index)

    if (b === null || removeInflight(b.inflight, req) === false) return

    // if (isBlock && this.core.bitfield.get(index) === false) {
    //   for (const peer of this.peers) peer.skipList.set(index, false)
    // }

    if (b.refs.length > 0 && isBlock === true) {
      this._queueBlock(b)
      return
    }

    b.gc()
  }

  _clearInflightUpgrade (req) {
    if (removeInflight(this._upgrade.inflight, req) === false) return
    this._upgrade.gc()
  }

  _clearInflightSeeks (req) {
    for (const s of this._seeks) {
      if (removeInflight(s.inflight, req) === false) continue
      s.gc()
    }
  }

  _clearInflightReorgs (req) {
    for (const r of this._reorgs) {
      removeInflight(r.inflight, req)
    }
  }

  _clearOldReorgs (fork) {
    for (let i = 0; i < this._reorgs.length; i++) {
      const f = this._reorgs[i]
      if (f.fork >= fork) continue
      if (i === this._reorgs.length - 1) this._reorgs.pop()
      else this._reorgs[i] = this._reorgs.pop()
      i--
    }
  }

  // "slow" updates here - async but not allowed to ever throw
  async _updateNonPrimary (updateAll) {
    // Check if running, if so skip it and the running one will issue another update for us (debounce)
    while (++this._updatesPending === 1) {
      for (let i = 0; i < this._ranges.length; i++) {
        const r = this._ranges[i]

        clampRange(this.core, r)

        if (r.end !== -1 && r.start >= r.end) {
          this._resolveRangeRequest(r, i--)
        }
      }

      for (let i = 0; i < this._seeks.length; i++) {
        const s = this._seeks[i]

        let err = null
        let res = null

        try {
          res = await s.seeker.update()
        } catch (error) {
          err = error
        }

        if (!res && !err) continue

        if (i < this._seeks.length - 1) this._seeks[i] = this._seeks.pop()
        else this._seeks.pop()

        i--

        if (err) s.reject(err)
        else s.resolve(res)
      }

      // No additional updates scheduled - break
      if (--this._updatesPending === 0) break
      // Debounce the additional updates - continue
      this._updatesPending = 0
    }

    if (this._inflight.idle || updateAll) this.updateAll()
  }

  _maybeResolveIfAvailableRanges () {
    if (this._ifAvailable > 0 || !this._inflight.idle || !this._ranges.length) return

    for (let i = 0; i < this.peers.length; i++) {
      if (this.peers[i].dataProcessing > 0) return
    }

    for (let i = 0; i < this._ranges.length; i++) {
      const r = this._ranges[i]

      if (r.ifAvailable) {
        this._resolveRangeRequest(r, i--)
      }
    }
  }

  _clearRequest (peer, req) {
    if (req.block !== null) {
      this._clearInflightBlock(this._blocks, req)
      this._unmarkInflight(req.block.index)
    }

    if (req.hash !== null) {
      this._clearInflightBlock(this._hashes, req)
    }

    if (req.upgrade !== null && this._upgrade !== null) {
      this._clearInflightUpgrade(req)
    }

    if (this._seeks.length > 0) {
      this._clearInflightSeeks(req)
    }

    if (this._reorgs.length > 0) {
      this._clearInflightReorgs(req)
    }
  }

  _onnodata (peer, req) {
    this._clearRequest(peer, req)
    this.updateAll()
  }

  _openSkipBitfield () {
    // technically the skip bitfield gets bits cleared if .clear() is called
    // also which might be in inflight also, but that just results in that section being overcalled shortly
    // worst case, so ok for now

    const bitfield = this.core.openSkipBitfield()

    for (const req of this._inflight) {
      if (req.block) bitfield.set(req.block.index, true) // skip
    }
  }

  _markInflight (index) {
    if (this.core.skipBitfield !== null) this.core.skipBitfield.set(index, true)
    for (const peer of this.peers) peer._markInflight(index)
  }

  _unmarkInflight (index) {
    if (this.core.skipBitfield !== null) this.core.skipBitfield.set(index, this.core.bitfield.get(index))
    for (const peer of this.peers) peer._resetMissingBlock(index)
  }

  _ondata (peer, req, data) {
    if (data.block !== null) {
      this._resolveBlockRequest(this._blocks, data.block.index, data.block.value, req)
    }

    if (data.hash !== null && (data.hash.index & 1) === 0) {
      this._resolveBlockRequest(this._hashes, data.hash.index / 2, null, req)
    }

    if (this._upgrade !== null) {
      this._resolveUpgradeRequest(req)
    }

    if (this._seeks.length > 0) {
      this._clearInflightSeeks(req)
    }

    if (this._reorgs.length > 0) {
      this._clearInflightReorgs(req)
    }

    if (this._manifestPeer === peer && this.core.header.manifest !== null) {
      this._manifestPeer = null
    }

    if (this._seeks.length > 0 || this._ranges.length > 0) this._updateNonPrimary(this._seeks.length > 0)
    this.updatePeer(peer)
  }

  _onwant (peer, start, length) {
    length = Math.min(length, this.core.tree.length - start)

    peer.protomux.cork()

    for (const msg of this.core.bitfield.want(start, length)) {
      peer.wireBitfield.send(msg)
    }

    peer.protomux.uncork()
  }

  async _onreorgdata (peer, req, data) {
    const newBatch = data.upgrade && await this.core.verifyReorg(data)
    const f = this._addReorg(data.fork, peer)

    if (f === null) {
      this.updateAll()
      return
    }

    removeInflight(f.inflight, req)

    if (f.batch) {
      await f.batch.update(data)
    } else if (data.upgrade) {
      f.batch = newBatch

      // Remove "older" reorgs in progress as we just verified this one.
      this._clearOldReorgs(f.fork)
    }

    if (f.batch && f.batch.finished) {
      if (this._addUpgradeMaybe() !== null) {
        await this._applyReorg(f)
      }
    }

    this.updateAll()
  }

  // Never throws, allowed to run in the background
  async _applyReorg (f) {
    // TODO: more optimal here to check if potentially a better reorg
    // is available, ie higher fork, and request that one first.
    // This will request that one after this finishes, which is fine, but we
    // should investigate the complexity in going the other way

    const u = this._upgrade

    this._reorgs = [] // clear all as the nodes are against the old tree - easier
    this._applyingReorg = this.core.reorg(f.batch, null) // TODO: null should be the first/last peer?

    try {
      await this._applyingReorg
    } catch (err) {
      this._upgrade = null
      u.reject(err)
    }

    this._applyingReorg = null

    if (this._upgrade !== null) {
      this._resolveUpgradeRequest(null)
    }

    for (const peer of this.peers) this._updateFork(peer)

    // TODO: all the remaining is a tmp workaround until we have a flag/way for ANY_FORK
    for (const r of this._ranges) {
      r.start = r.userStart
      r.end = r.userEnd
    }

    this.updateAll()
  }

  _maybeUpdate () {
    return this._upgrade !== null && this._upgrade.inflight.length === 0
  }

  _maybeRequestManifest () {
    return this.core.header.manifest === null && this._manifestPeer === null
  }

  _updateFork (peer) {
    if (this._applyingReorg !== null || this.allowFork === false || peer.remoteFork <= this.core.tree.fork) {
      return false
    }

    const f = this._addReorg(peer.remoteFork, peer)

    // TODO: one per peer is better
    if (f !== null && f.batch === null && f.inflight.length === 0) {
      return peer._requestForkProof(f)
    }

    return false
  }

  _updatePeer (peer) {
    if (!peer.isActive() || peer.inflight >= peer.getMaxInflight()) {
      return false
    }

    // Eagerly request the manifest even if the remote length is 0. If not 0 we'll get as part of the upgrade request...
    if (this._maybeRequestManifest() === true && peer.remoteLength === 0 && peer.remoteHasManifest === true) {
      this._manifestPeer = peer
      peer._requestManifest()
    }

    for (const s of this._seeks) {
      if (s.inflight.length > 0) continue // TODO: one per peer is better
      if (peer._requestSeek(s) === true) {
        return true
      }
    }

    // Implied that any block in the queue should be requested, no matter how many inflights
    const blks = new RandomIterator(this._queued)

    for (const b of blks) {
      if (b.queued === false || peer._requestBlock(b) === true) {
        b.queued = false
        blks.dequeue()
        return true
      }
    }

    return false
  }

  _updatePeerNonPrimary (peer) {
    if (!peer.isActive() || peer.inflight >= peer.getMaxInflight()) {
      return false
    }

    const ranges = new RandomIterator(this._ranges)

    for (const r of ranges) {
      if (peer._requestRange(r) === true) {
        return true
      }
    }

    // Iterate from newest fork to oldest fork...
    for (let i = this._reorgs.length - 1; i >= 0; i--) {
      const f = this._reorgs[i]
      if (f.batch !== null && f.inflight.length === 0 && peer._requestForkRange(f) === true) {
        return true
      }
    }

    if (this._maybeUpdate() === true && peer._requestUpgrade(this._upgrade) === true) {
      return true
    }

    return false
  }

  updatePeer (peer) {
    // Quick shortcut to wait for flushing reorgs - not needed but less waisted requests
    if (this._applyingReorg !== null) return

    while (this._updatePeer(peer) === true);
    while (this._updatePeerNonPrimary(peer) === true);

    this._checkUpgradeIfAvailable()
    this._maybeResolveIfAvailableRanges()
  }

  updateAll () {
    // Quick shortcut to wait for flushing reorgs - not needed but less waisted requests
    if (this._applyingReorg !== null) return

    const peers = new RandomIterator(this.peers)

    for (const peer of peers) {
      if (this._updatePeer(peer) === true) {
        peers.requeue()
      }
    }

    // Check if we can skip the non primary check fully
    if (this._maybeUpdate() === false && this._ranges.length === 0 && this._reorgs.length === 0) {
      this._checkUpgradeIfAvailable()
      return
    }

    for (const peer of peers.restart()) {
      if (this._updatePeerNonPrimary(peer) === true) {
        peers.requeue()
      }
    }

    this._checkUpgradeIfAvailable()
    this._maybeResolveIfAvailableRanges()
  }

  _closeSession () {
    this.core.active--

    // we were the last active ref, so lets shut things down
    if (this.core.active === 0 && this.core.sessions.length === 0) {
      this.destroy()
      this.core.close().catch(safetyCatch)
      return
    }

    // in case one session is still alive but its been marked for auto close also kill it
    if (this.core.sessions.length === 1 && this.core.active === 1 && this.core.sessions[0].autoClose) {
      this.core.sessions[0].close().catch(safetyCatch)
    }
  }

  attached (protomux) {
    return this._attached.has(protomux)
  }

  attachTo (protomux, useSession) {
    if (useSession) {
      this.core.active++
    }

    const makePeer = this._makePeer.bind(this, protomux, useSession)

    this._attached.add(protomux)
    protomux.pair({ protocol: 'hypercore/alpha', id: this.discoveryKey }, makePeer)
    protomux.stream.setMaxListeners(0)
    protomux.stream.on('close', this._onstreamclose)

    this._ifAvailable++
    protomux.stream.opened.then((opened) => {
      this._ifAvailable--

      if (opened && !this.destroyed) makePeer()
      else if (useSession) this._closeSession()
      this._checkUpgradeIfAvailable()
    })
  }

  detachFrom (protomux) {
    if (this._attached.delete(protomux)) {
      protomux.stream.removeListener('close', this._onstreamclose)
      protomux.unpair({ protocol: 'hypercore/alpha', id: this.discoveryKey })
    }
  }

  destroy () {
    this.destroyed = true
    if (this._downloadingTimer) {
      clearTimeout(this._downloadingTimer)
      this._downloadingTimer = null
    }
    for (const peer of this.peers) {
      this.detachFrom(peer.protomux)
      peer.channel.close()
    }
    for (const protomux of this._attached) {
      this.detachFrom(protomux)
    }
  }

  _makePeer (protomux, useSession) {
    const replicator = this
    if (protomux.opened({ protocol: 'hypercore/alpha', id: this.discoveryKey })) return onnochannel()

    const channel = protomux.createChannel({
      userData: null,
      protocol: 'hypercore/alpha',
      aliases: ['hypercore'],
      id: this.discoveryKey,
      handshake: m.wire.handshake,
      messages: [
        { encoding: m.wire.sync, onmessage: onwiresync },
        { encoding: m.wire.request, onmessage: onwirerequest },
        { encoding: m.wire.cancel, onmessage: onwirecancel },
        { encoding: m.wire.data, onmessage: onwiredata },
        { encoding: m.wire.noData, onmessage: onwirenodata },
        { encoding: m.wire.want, onmessage: onwirewant },
        { encoding: m.wire.unwant, onmessage: onwireunwant },
        { encoding: m.wire.bitfield, onmessage: onwirebitfield },
        { encoding: m.wire.range, onmessage: onwirerange },
        { encoding: m.wire.extension, onmessage: onwireextension }
      ],
      onopen: onwireopen,
      onclose: onwireclose,
      ondrain: onwiredrain
    })

    if (channel === null) return onnochannel()

    const peer = new Peer(replicator, protomux, channel, useSession, this.inflightRange)
    const stream = protomux.stream

    peer.channel.open({
      seeks: true,
      capability: caps.replicate(stream.isInitiator, this.key, stream.handshakeHash)
    })

    return true

    function onnochannel () {
      if (useSession) replicator._closeSession()
      return false
    }
  }
}

function removeInflight (inf, req) {
  const i = inf.indexOf(req)
  if (i === -1) return false
  if (i < inf.length - 1) inf[i] = inf.pop()
  else inf.pop()
  return true
}

function noop () {}

function toLength (start, end) {
  return end === -1 ? -1 : (end < start ? 0 : end - start)
}

function clampRange (core, r) {
  if (r.blocks === null) {
    const start = core.bitfield.firstUnset(r.start)

    if (r.end === -1) r.start = start === -1 ? core.tree.length : start
    else if (start === -1 || start >= r.end) r.start = r.end
    else {
      r.start = start

      const end = core.bitfield.lastUnset(r.end - 1)

      if (end === -1 || start >= end + 1) r.end = r.start
      else r.end = end + 1
    }
  } else {
    while (r.start < r.end && core.bitfield.get(r.blocks[r.start])) r.start++
    while (r.start < r.end && core.bitfield.get(r.blocks[r.end - 1])) r.end--
  }
}

function onrequesttimeout (req) {
  if (req.context) req.context.detach(req, REQUEST_TIMEOUT())
}

function destroyRequestTimeout (req) {
  if (req.timeout !== null) {
    clearTimeout(req.timeout)
    req.timeout = null
  }
}

function onwireopen (m, c) {
  return c.userData.onopen(m)
}

function onwireclose (isRemote, c) {
  return c.userData.onclose(isRemote)
}

function onwiredrain (c) {
  return c.userData.ondrain()
}

function onwiresync (m, c) {
  return c.userData.onsync(m)
}

function onwirerequest (m, c) {
  return c.userData.onrequest(m)
}

function onwirecancel (m, c) {
  return c.userData.oncancel(m)
}

function onwiredata (m, c) {
  return c.userData.ondata(m)
}

function onwirenodata (m, c) {
  return c.userData.onnodata(m)
}

function onwirewant (m, c) {
  return c.userData.onwant(m)
}

function onwireunwant (m, c) {
  return c.userData.onunwant(m)
}

function onwirebitfield (m, c) {
  return c.userData.onbitfield(m)
}

function onwirerange (m, c) {
  return c.userData.onrange(m)
}

function onwireextension (m, c) {
  return c.userData.onextension(m)
}

function setDownloadingLater (repl, downloading, session) {
  repl.setDownloadingNow(downloading, session)
}
