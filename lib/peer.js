const b4a = require('b4a')
const hypertrace = require("hypertrace")
const flatTree = require('flat-tree')
const safetyCatch = require('safety-catch')
const { INVALID_CAPABILITY } = require('hypercore-errors')

const ReceiverQueue = require('./receiver-queue')
const RemoteBitfield = require("./remote-bitfield")
const caps = require('./caps')

const SCALE_LATENCY = 50
const DEFAULT_SEGMENT_SIZE = 256 * 1024 * 8 // 256 KiB in bits

const PRIORITY = {
  NORMAL: 0,
  HIGH: 1,
  VERY_HIGH: 2
}

module.exports = class Peer {
  constructor (replicator, protomux, channel, useSession, inflightRange) {
    this.tracer = hypertrace.createTracer(this, { parent: replicator.core.tracer })
    this.core = replicator.core
    this.replicator = replicator
    this.stream = protomux.stream
    this.protomux = protomux
    this.remotePublicKey = this.stream.remotePublicKey
    /* -------------------------------------------------------------------------- */
    /*                      this.remoteSupportsSeeks = false                      */
    /* -------------------------------------------------------------------------- */
    this.inflightRange = inflightRange

    this.paused = false

    this.useSession = useSession

    this.channel = channel
    this.channel.userData = this

    this.wireSync = this.channel.messages[0]
    this.wireRequest = this.channel.messages[1]
    this.wireCancel = this.channel.messages[2]
    this.wireData = this.channel.messages[3]
    this.wireNoData = this.channel.messages[4]
    this.wireWant = this.channel.messages[5]
    this.wireUnwant = this.channel.messages[6]
    this.wireBitfield = this.channel.messages[7]
    this.wireRange = this.channel.messages[8]
    this.wireExtension = this.channel.messages[9]

    this.receiverQueue = new ReceiverQueue()
    this.receiverBusy = false

    this.inflight = 0
    this.dataProcessing = 0

    this.canUpgrade = true

    this.needsSync = false
    this.syncsProcessing = 0

    this._remoteContiguousLength = 0

    // TODO: tweak pipelining so that data sent BEFORE remoteOpened is not cap verified!
    // we might wanna tweak that with some crypto, ie use the cap to encrypt it...
    // or just be aware of that, to only push non leaky data

    this.remoteOpened = false
    this.remoteBitfield = new RemoteBitfield()
    this.missingBlocks = new RemoteBitfield()

    this.remoteFork = 0
    this.remoteLength = 0
    this.remoteCanUpgrade = false
    this.remoteUploading = true
    this.remoteDownloading = true
    this.remoteSynced = false
    this.remoteHasManifest = false

    this.segmentsWanted = new Set()
    this.broadcastedNonSparse = false

    this.lengthAcked = 0

    this.extensions = new Map()
    this.lastExtensionSent = ''
    this.lastExtensionRecv = ''

    replicator._ifAvailable++
  }

  get remoteContiguousLength () {
    return this.remoteBitfield.findFirst(false, this._remoteContiguousLength)
  }

  getMaxInflight () {
    const stream = this.stream.rawStream
    if (!stream.udx) return Math.min(this.inflightRange[1], this.inflightRange[0] * 3)

    const scale = stream.rtt <= SCALE_LATENCY ? 1 : stream.rtt / SCALE_LATENCY * Math.min(1, 2 / this.replicator.peers.length)
    return Math.max(this.inflightRange[0], Math.round(Math.min(this.inflightRange[1], this.inflightRange[0] * scale)))
  }

  signalUpgrade () {
    if (this._shouldUpdateCanUpgrade() === true) this._updateCanUpgradeAndSync()
    else this.sendSync()
  }

  _markInflight (index) {
    this.missingBlocks.set(index, false)
  }

  broadcastRange (start, length, drop) {
    if (drop) this._unclearLocalRange(start, length)
    else this._clearLocalRange(start, length)

    // TODO: consider also adding early-returns on the drop===true case
    if (!drop) {
      // No need to broadcast if the remote already has this range

      if (this._remoteContiguousLength >= start + length) return

      if (length === 1) {
        if (this.remoteBitfield.get(start)) return
      } else {
        if (this.remoteBitfield.firstUnset(start) >= start + length) return
      }
    }

    this.wireRange.send({
      drop,
      start,
      length
    })
  }

  extension (name, message) {
    this.wireExtension.send({ name: name === this.lastExtensionSent ? '' : name, message })
    this.lastExtensionSent = name
  }

  onextension (message) {
    const name = message.name || this.lastExtensionRecv
    this.lastExtensionRecv = name
    const ext = this.extensions.get(name)
    if (ext) ext._onmessage({ start: 0, end: message.byteLength, buffer: message.message }, this)
  }

  sendSync () {
    if (this.syncsProcessing !== 0) {
      this.needsSync = true
      return
    }

    if (this.core.tree.fork !== this.remoteFork) {
      this.canUpgrade = false
    }

    this.needsSync = false

    this.wireSync.send({
      fork: this.core.tree.fork,
      length: this.core.tree.length,
      remoteLength: this.core.tree.fork === this.remoteFork ? this.remoteLength : 0,
      canUpgrade: this.canUpgrade,
      uploading: true,
      downloading: this.replicator.isDownloading(),
      hasManifest: !!this.core.header.manifest && this.core.compat === false
    })
  }

  onopen ({ seeks, capability }) {
    const expected = caps.replicate(this.stream.isInitiator === false, this.replicator.key, this.stream.handshakeHash)

    if (b4a.equals(capability, expected) !== true) { // TODO: change this to a rejection instead, less leakage
      throw INVALID_CAPABILITY('Remote sent an invalid replication capability')
    }

    if (this.remoteOpened === true) return
    this.remoteOpened = true
    this.remoteSupportsSeeks = seeks

    this.protomux.cork()

    this.sendSync()

    const contig = Math.min(this.core.tree.length, this.core.header.hints.contiguousLength)
    if (contig > 0) {
      this.broadcastRange(0, contig, false)

      if (contig === this.core.tree.length) {
        this.broadcastedNonSparse = true
      }
    }

    this.replicator._ifAvailable--
    this.replicator._addPeer(this)

    this.protomux.uncork()
  }

  onclose (isRemote) {
    this.tracer.trace('onclose')

    // we might have signalled to the remote that we are done (ie not downloading) and the remote might agree on that
    // if that happens, the channel might be closed by the remote. if so just renegotiate it.
    // TODO: add a CLOSE_REASON to mux to we can make this cleaner...
    const reopen = isRemote === true && this.remoteOpened === true && this.remoteDownloading === false &&
       this.remoteUploading === true && this.replicator.downloading === true

    if (this.useSession && !reopen) this.replicator._closeSession()

    if (this.remoteOpened === false) {
      this.replicator._ifAvailable--
      this.replicator.updateAll()
      return
    }

    this.remoteOpened = false
    this.replicator._removePeer(this)

    if (reopen) {
      this.replicator._makePeer(this.protomux, this.useSession)
    }
  }

  closeIfIdle () {
    if (this.remoteDownloading === false && this.replicator.isDownloading() === false) {
      // idling, shut it down...
      this.channel.close()
      return true
    }

    return false
  }

  async onsync ({ fork, length, remoteLength, canUpgrade, uploading, downloading, hasManifest }) {
    const lengthChanged = length !== this.remoteLength
    const sameFork = fork === this.core.tree.fork

    this.remoteSynced = true
    this.remoteFork = fork
    this.remoteLength = length
    this.remoteCanUpgrade = canUpgrade
    this.remoteUploading = uploading
    this.remoteDownloading = downloading
    this.remoteHasManifest = hasManifest

    if (this.closeIfIdle()) return

    this.lengthAcked = sameFork ? remoteLength : 0
    this.syncsProcessing++

    this.replicator._updateFork(this)

    if (this.remoteLength > this.core.tree.length && this.lengthAcked === this.core.tree.length) {
      if (this.replicator._addUpgradeMaybe() !== null) this._update()
    }

    const upgrade = (lengthChanged === false || sameFork === false)
      ? this.canUpgrade && sameFork
      : await this._canUpgrade(length, fork)

    if (length === this.remoteLength && fork === this.core.tree.fork) {
      this.canUpgrade = upgrade
    }

    if (--this.syncsProcessing !== 0) return // ie not latest

    if (this.needsSync === true || (this.core.tree.fork === this.remoteFork && this.core.tree.length > this.remoteLength)) {
      this.signalUpgrade()
    }

    this._update()
  }

  _shouldUpdateCanUpgrade () {
    return this.core.tree.fork === this.remoteFork &&
      this.core.tree.length > this.remoteLength &&
      this.canUpgrade === false &&
      this.syncsProcessing === 0
  }

  async _updateCanUpgradeAndSync () {
    const { length, fork } = this.core.tree

    const canUpgrade = await this._canUpgrade(this.remoteLength, this.remoteFork)

    if (this.syncsProcessing > 0 || length !== this.core.tree.length || fork !== this.core.tree.fork) {
      return
    }
    if (canUpgrade === this.canUpgrade) {
      return
    }

    this.canUpgrade = canUpgrade
    this.sendSync()
  }

  // Safe to call in the background - never fails
  async _canUpgrade (remoteLength, remoteFork) {
    if (remoteFork !== this.core.tree.fork) return false

    if (remoteLength === 0) return true
    if (remoteLength >= this.core.tree.length) return false

    try {
      // Rely on caching to make sure this is cheap...
      const canUpgrade = await this.core.tree.upgradeable(remoteLength)

      if (remoteFork !== this.core.tree.fork) return false

      return canUpgrade
    } catch {
      return false
    }
  }

  async _getProof (msg) {
    const proof = await this.core.tree.proof(msg)

    if (proof.block) {
      const index = msg.block.index

      if (msg.fork !== this.core.tree.fork || !this.core.bitfield.get(index)) {
        return null
      }

      proof.block.value = await this.core.blocks.get(index)
    }

    if (msg.manifest && !this.core.compat) {
      proof.manifest = this.core.header.manifest
    }

    return proof
  }

  async onrequest (msg) {
    this.tracer.trace('onrequest', msg)

    if (!this.protomux.drained || this.receiverQueue.length) {
      this.receiverQueue.push(msg)
      return
    }

    await this._handleRequest(msg)
  }

  oncancel (msg) {
    this.receiverQueue.delete(msg.request)
  }

  ondrain () {
    return this._handleRequests()
  }

  async _handleRequests () {
    if (this.receiverBusy) return
    this.receiverBusy = true
    this.protomux.cork()

    while (this.remoteOpened && this.protomux.drained && this.receiverQueue.length > 0) {
      const msg = this.receiverQueue.shift()
      await this._handleRequest(msg)
    }

    this.protomux.uncork()
    this.receiverBusy = false
  }

  async _handleRequest (msg) {
    let proof = null

    // TODO: could still be answerable if (index, fork) is an ancestor of the current fork
    if (msg.fork === this.core.tree.fork) {
      try {
        proof = await this._getProof(msg)
      } catch (err) {
        safetyCatch(err)
        if (msg.fork === this.core.tree.fork && isCriticalError(err)) throw err
      }
    }

    if (proof === null) {
      if (msg.manifest && this.core.header.manifest) {
        const manifest = this.core.header.manifest
        this.wireData.send({ request: msg.id, fork: this.core.tree.fork, block: null, hash: null, seek: null, upgrade: null, manifest })
        return
      }

      this.wireNoData.send({ request: msg.id })
      return
    }

    if (proof.block !== null) {
      this.replicator.onupload(proof.block.index, proof.block.value, this)
    }

    this.wireData.send({
      request: msg.id,
      fork: msg.fork,
      block: proof.block,
      hash: proof.hash,
      seek: proof.seek,
      upgrade: proof.upgrade,
      manifest: proof.manifest
    })
  }

  _cancelRequest (id) {
    const req = this.replicator._inflight.get(id)
    if (!req) return

    this.inflight--
    this.replicator._removeInflight(id)
    if (isBlockRequest(req)) this.replicator._unmarkInflight(req.block.index)

    this.wireCancel.send({ request: id })
  }

  _checkIfConflict () {
    this.paused = true

    const length = Math.min(this.core.tree.length, this.remoteLength)
    if (length === 0) return // pause and ignore

    this.wireRequest.send({
      id: 0, // TODO: use an more explicit id for this eventually...
      fork: this.remoteFork,
      block: null,
      hash: null,
      seek: null,
      upgrade: {
        start: 0,
        length
      }
    })
  }

  async ondata (data) {
    this.tracer.trace('ondata', data)

    // always allow a fork conflict proof to be sent
    if (data.request === 0 && data.upgrade && data.upgrade.start === 0) {
      if (await this.core.checkConflict(data, this)) return
      this.paused = false
    }

    const req = data.request > 0 ? this.replicator._inflight.get(data.request) : null
    const reorg = data.fork > this.core.tree.fork

    // no push atm, TODO: check if this satisfies another pending request
    // allow reorg pushes tho as those are not written to storage so we'll take all the help we can get
    if (req === null && reorg === false) return

    if (req !== null) {
      if (req.peer !== this) return
      this.inflight--
      this.replicator._removeInflight(req.id)
    }

    try {
      if (reorg === true) return await this.replicator._onreorgdata(this, req, data)
    } catch (err) {
      safetyCatch(err)
      if (isBlockRequest(req)) this.replicator._unmarkInflight(req.block.index)

      this.paused = true
      this.replicator.oninvalid(err, req, data, this)
      return
    }

    this.dataProcessing++

    try {
      if (!matchingRequest(req, data) || !(await this.core.verify(data, this))) {
        this.replicator._onnodata(this, req)
        return
      }
    } catch (err) {
      safetyCatch(err)
      if (isBlockRequest(req)) this.replicator._unmarkInflight(req.block.index)

      if (err.code === 'WRITE_FAILED') {
        // For example, we don't want to keep pulling data when storage is full
        // TODO: notify the user somehow
        this.paused = true
        return
      }

      if (this.core.closed && !isCriticalError(err)) return

      if (err.code !== 'INVALID_OPERATION') {
        // might be a fork, verify
        this._checkIfConflict()
      }

      this.replicator._onnodata(this, req)
      this.replicator.oninvalid(err, req, data, this)
      return
    } finally {
      this.dataProcessing--
    }

    this.replicator._ondata(this, req, data)

    if (this._shouldUpdateCanUpgrade() === true) {
      this._updateCanUpgradeAndSync()
    }
  }

  onnodata ({ request }) {
    this.tracer.trace('onnodata', { request })

    const req = request > 0 ? this.replicator._inflight.get(request) : null

    if (req === null || req.peer !== this) return

    this.inflight--
    this.replicator._removeInflight(req.id)
    this.replicator._onnodata(this, req)
  }

  onwant ({ start, length }) {
    this.replicator._onwant(this, start, length)
  }

  onunwant () {
    // TODO
  }

  onbitfield ({ start, bitfield }) {
    if (start < this._remoteContiguousLength) this._remoteContiguousLength = start // bitfield is always the truth
    this.remoteBitfield.insert(start, bitfield)
    this.missingBlocks.insert(start, bitfield)
    this._clearLocalRange(start, bitfield.byteLength * 8)
    this._update()
  }

  _clearLocalRange (start, length) {
    const bitfield = this.core.skipBitfield === null ? this.core.bitfield : this.core.skipBitfield

    if (length === 1) {
      this.missingBlocks.set(start, this._remoteHasBlock(start) && !bitfield.get(start))
      return
    }

    const contig = Math.min(this.core.tree.length, this.core.header.hints.contiguousLength)

    if (start + length < contig) {
      const delta = contig - start
      this.missingBlocks.setRange(start, delta, false)
      return
    }

    const rem = start & 32767
    if (rem > 0) {
      start -= rem
      length += rem
    }

    const end = start + Math.min(length, this.core.tree.length)
    while (start < end) {
      const local = bitfield.getBitfield(start)

      if (local && local.bitfield) {
        this.missingBlocks.clear(start, local.bitfield)
      }

      start += 32768
    }
  }

  _resetMissingBlock (index) {
    const bitfield = this.core.skipBitfield === null ? this.core.bitfield : this.core.skipBitfield
    this.missingBlocks.set(index, this._remoteHasBlock(index) && !bitfield.get(index))
  }

  _unclearLocalRange (start, length) {
    if (length === 1) {
      this._resetMissingBlock(start)
      return
    }

    const rem = start & 2097151
    if (rem > 0) {
      start -= rem
      length += rem
    }

    const fixedStart = start

    const end = start + Math.min(length, this.remoteLength)
    while (start < end) {
      const remote = this.remoteBitfield.getBitfield(start)
      if (remote && remote.bitfield) {
        this.missingBlocks.insert(start, remote.bitfield)
      }

      start += 2097152
    }

    this._clearLocalRange(fixedStart, length)
  }

  onrange ({ drop, start, length }) {
    const has = drop === false

    if (drop === true && start < this._remoteContiguousLength) {
      this._remoteContiguousLength = start
    }

    if (start === 0 && drop === false && length > this._remoteContiguousLength) {
      this._remoteContiguousLength = length
    } else if (length === 1) {
      const bitfield = this.core.skipBitfield === null ? this.core.bitfield : this.core.skipBitfield
      this.remoteBitfield.set(start, has)
      this.missingBlocks.set(start, has && !bitfield.get(start))
    } else {
      const rangeStart = this.remoteBitfield.findFirst(!has, start)
      const rangeLength = length - (rangeStart - start)

      if (rangeLength > 0) {
        this.remoteBitfield.setRange(rangeStart, rangeLength, has)
        this.missingBlocks.setRange(rangeStart, rangeLength, has)
        if (has) this._clearLocalRange(rangeStart, rangeLength)
      }
    }

    if (drop === false) this._update()
  }

  onreorghint () {
    // TODO
  }

  _update () {
    // TODO: if this is in a batch or similar it would be better to defer it
    // we could do that with nextTick/microtick mb? (combined with a property on the session to signal read buffer mb)
    this.replicator.updatePeer(this)
  }

  async _onconflict () {
    this.protomux.cork()
    if (this.remoteLength > 0 && this.core.tree.fork === this.remoteFork) {
      await this.onrequest({
        id: 0,
        fork: this.core.tree.fork,
        block: null,
        hash: null,
        seek: null,
        upgrade: {
          start: 0,
          length: Math.min(this.core.tree.length, this.remoteLength)
        }
      })
    }
    this.channel.close()
    this.protomux.uncork()
  }

  _makeRequest (needsUpgrade, priority) {
    if (needsUpgrade === true && this.replicator._shouldUpgrade(this) === false) {
      return null
    }

    if (needsUpgrade === false && this.replicator._autoUpgrade(this) === true) {
      needsUpgrade = true
    }

    return {
      peer: this,
      id: 0,
      fork: this.remoteFork,
      block: null,
      hash: null,
      seek: null,
      upgrade: needsUpgrade === false
        ? null
        : { start: this.core.tree.length, length: this.remoteLength - this.core.tree.length },
      // remote manifest check can be removed eventually...
      manifest: this.core.header.manifest === null && this.remoteHasManifest === true,
      priority
    }
  }

  _requestManifest () {
    const req = this._makeRequest(false, 0)
    this._send(req)
  }

  _requestUpgrade (u) {
    const req = this._makeRequest(true, 0)
    if (req === null) return false

    this._send(req)

    return true
  }

  _requestSeek (s) {
    // if replicator is updating the seeks etc, bail and wait for it to drain
    if (this.replicator._updatesPending > 0) return false

    const { length, fork } = this.core.tree

    if (fork !== this.remoteFork) return false

    if (s.seeker.start >= length) {
      const req = this._makeRequest(true, 0)

      // We need an upgrade for the seek, if non can be provided, skip
      if (req === null) return false

      req.seek = this.remoteSupportsSeeks ? { bytes: s.seeker.bytes, padding: s.seeker.padding } : null

      s.inflight.push(req)
      this._send(req)

      return true
    }

    const len = s.seeker.end - s.seeker.start
    const off = s.seeker.start + Math.floor(Math.random() * len)

    for (let i = 0; i < len; i++) {
      let index = off + i
      if (index > s.seeker.end) index -= len

      if (this.remoteBitfield.get(index) === false) continue
      if (this.core.bitfield.get(index) === true) continue
      if (!this._hasTreeParent(index)) continue

      // Check if this block is currently inflight - if so pick another
      const b = this.replicator._blocks.get(index)
      if (b !== null && b.inflight.length > 0) continue

      // Block is not inflight, but we only want the hash, check if that is inflight
      const h = this.replicator._hashes.add(index, PRIORITY.NORMAL)
      if (h.inflight.length > 0) continue

      const req = this._makeRequest(false, h.priority)
      const nodes = flatTree.depth(s.seeker.start + s.seeker.end - 1)

      req.hash = { index: 2 * index, nodes }
      req.seek = this.remoteSupportsSeeks ? { bytes: s.seeker.bytes, padding: s.seeker.padding } : null

      s.inflight.push(req)
      h.inflight.push(req)
      this._send(req)

      return true
    }

    this._maybeWant(s.seeker.start, len)
    return false
  }

  _hasTreeParent (index) {
    if (this.remoteLength >= this.core.tree.length) return true

    const ite = flatTree.iterator(index * 2)

    let span = 2
    let length = 0

    while (true) {
      ite.parent()

      const left = (ite.index - ite.factor / 2 + 1) / 2
      length = left + span

      // if larger than local AND larger than remote - they share the root so its ok
      if (length > this.core.tree.length) {
        if (length > this.remoteLength) return true
        break
      }

      // its less than local but larger than remote so skip it
      if (length > this.remoteLength) break

      span *= 2
      const first = this.core.bitfield.findFirst(true, left)
      if (first > -1 && first < length) return true
    }

    // TODO: push to async queue and check against our local merkle tree if we actually can request this block
    return false
  }

  _remoteHasBlock (index) {
    return index < this._remoteContiguousLength || this.remoteBitfield.get(index) === true
  }

  _sendBlockRequest (req, b) {
    req.block = { index: b.index, nodes: 0 }
    this.replicator._markInflight(b.index)

    b.inflight.push(req)
    this._send(req)
  }

  _requestBlock (b) {
    const { length, fork } = this.core.tree

    if (this._remoteHasBlock(b.index) === false || fork !== this.remoteFork) {
      this._maybeWant(b.index)
      return false
    }

    if (!this._hasTreeParent(b.index)) {
      return false
    }

    const req = this._makeRequest(b.index >= length, b.priority)
    if (req === null) return false

    this._sendBlockRequest(req, b)

    return true
  }

  _requestRangeBlock (index, length) {
    if (this.core.bitfield.get(index) === true || !this._hasTreeParent(index)) return false

    const b = this.replicator._blocks.add(index, PRIORITY.NORMAL)
    if (b.inflight.length > 0) {
      this.missingBlocks.set(index, false) // in case we missed some states just set them ondemand, nbd
      return false
    }

    const req = this._makeRequest(index >= length, b.priority)

    // If the request cannot be satisfied, dealloc the block request if no one is subscribed to it
    if (req === null) {
      b.gc()
      return false
    }

    this._sendBlockRequest(req, b)

    // Don't think this will ever happen, as the pending queue is drained before the range queue
    // but doesn't hurt to check this explicitly here also.
    if (b.queued) b.queued = false
    return true
  }

  _findNext (i) {
    if (i < this._remoteContiguousLength) {
      if (this.core.skipBitfield === null) this.replicator._openSkipBitfield()
      i = this.core.skipBitfield.findFirst(false, i)
      if (i < this._remoteContiguousLength && i > -1) return i
      i = this._remoteContiguousLength
    }

    return this.missingBlocks.findFirst(true, i)
  }

  _requestRange (r) {
    const { length, fork } = this.core.tree

    if (r.blocks) {
      let min = -1
      let max = -1

      for (let i = r.start; i < r.end; i++) {
        const index = r.blocks[i]
        if (min === -1 || index < min) min = index
        if (max === -1 || index > max) max = index
        const has = index < this._remoteContiguousLength || this.missingBlocks.get(index) === true
        if (has === true && this._requestRangeBlock(index, length)) return true
      }

      if (min > -1) this._maybeWant(min, max - min)
      return false
    }

    const end = Math.min(this.core.tree.length, Math.min(r.end === -1 ? this.remoteLength : r.end, this.remoteLength))
    if (end <= r.start || fork !== this.remoteFork) return false

    const len = end - r.start
    const off = r.start + (r.linear ? 0 : Math.floor(Math.random() * len))

    let i = off

    while (true) {
      i = this._findNext(i)
      if (i === -1 || i >= end) break

      if (this._requestRangeBlock(i, length)) return true
      i++
    }

    i = r.start

    while (true) {
      i = this._findNext(i)
      if (i === -1 || i >= off) break

      if (this._requestRangeBlock(i, length)) return true
      i++
    }

    this._maybeWant(r.start, len)
    return false
  }

  _requestForkProof (f) {
    const req = this._makeRequest(false, 0)

    req.upgrade = { start: 0, length: this.remoteLength }
    req.manifest = !this.core.header.manifest

    f.inflight.push(req)
    this._send(req)
  }

  _requestForkRange (f) {
    if (f.fork !== this.remoteFork || f.batch.want === null) return false

    const end = Math.min(f.batch.want.end, this.remoteLength)
    if (end < f.batch.want.start) return false

    const len = end - f.batch.want.start
    const off = f.batch.want.start + Math.floor(Math.random() * len)

    for (let i = 0; i < len; i++) {
      let index = off + i
      if (index >= end) index -= len

      if (this._remoteHasBlock(index) === false) continue

      const req = this._makeRequest(false, 0)

      req.hash = { index: 2 * index, nodes: f.batch.want.nodes }

      f.inflight.push(req)
      this._send(req)

      return true
    }

    this._maybeWant(f.batch.want.start, len)
    return false
  }

  _maybeWant (start, length = 1) {
    if (start + length <= this.remoteContiguousLength) return

    let i = Math.floor(start / DEFAULT_SEGMENT_SIZE)
    const n = Math.ceil((start + length) / DEFAULT_SEGMENT_SIZE)

    for (; i < n; i++) {
      if (this.segmentsWanted.has(i)) continue
      this.segmentsWanted.add(i)

      this.wireWant.send({
        start: i * DEFAULT_SEGMENT_SIZE,
        length: DEFAULT_SEGMENT_SIZE
      })
    }
  }

  isActive () {
    if (this.paused || this.removed) return false
    return true
  }

  async _send (req) {
    const fork = this.core.tree.fork

    this.inflight++
    this.replicator._inflight.add(req)

    if (req.upgrade !== null && req.fork === fork) {
      const u = this.replicator._addUpgrade()
      u.inflight.push(req)
    }

    try {
      if (req.block !== null && req.fork === fork) {
        req.block.nodes = await this.core.tree.missingNodes(2 * req.block.index)
      }
      if (req.hash !== null && req.fork === fork && req.hash.nodes === 0) {
        req.hash.nodes = await this.core.tree.missingNodes(req.hash.index)

        // nodes === 0, we already have it, bail
        if (req.hash.nodes === 0 && (req.hash.index & 1) === 0) {
          this.inflight--
          this.replicator._resolveHashLocally(this, req)
          return
        }
      }
    } catch (err) {
      this.stream.destroy(err)
      return
    }

    this.tracer.trace('send', req)

    this.wireRequest.send(req)
  }
}

function isCriticalError (err) {
  // TODO: expose .critical or similar on the hypercore errors that are critical (if all not are)
  return err.name === 'HypercoreError'
}


function isBlockRequest (req) {
  return req !== null && req.block !== null
}

function matchingRequest (req, data) {
  if (data.block !== null && (req.block === null || req.block.index !== data.block.index)) return false
  if (data.hash !== null && (req.hash === null || req.hash.index !== data.hash.index)) return false
  if (data.seek !== null && (req.seek === null || req.seek.bytes !== data.seek.bytes)) return false
  if (data.upgrade !== null && req.upgrade === null) return false
  return req.fork === data.fork
}
