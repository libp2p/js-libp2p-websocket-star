"use strict"

const debug = require('debug')
const log = debug('libp2p:websocket-star')
const multiaddr = require('multiaddr')
const mafmt = require('mafmt')
const io = require('socket.io-client')
const ss = require('socket.io-stream')
const uuid = require("uuid")
const EE = require('events').EventEmitter
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const Connection = require('interface-connection').Connection
const toPull = require('stream-to-pull-stream')
const once = require('once')
const setImmediate = require('async/setImmediate')
const utils = require('./utils')
const cleanUrlSIO = utils.cleanUrlSIO

const noop = once(() => {})

const sioOptions = {
  transports: ['websocket'],
  'force new connection': true
}

class WebsocketStar {
  constructor(options) {
    options = options || {}

    this.maSelf = undefined

    this.sioOptions = {
      transports: ['websocket'],
      'force new connection': true
    }

    this.discovery = new EE()
    this.discovery.start = (callback) => {
      setImmediate(callback)
    }
    this.discovery.stop = (callback) => {
      setImmediate(callback)
    }

    this.listenersRefs = {}
    this._peerDiscovered = this._peerDiscovered.bind(this)
  }

  dial(ma, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    const conn = new Connection()

    const outstream = ss.createStream()
    const outpull = toPull.sink(outstream) //the stream is converted to a source on the other end by socket.io-stream
    const dialId = uuid()

    callback = callback ? once(callback) : noop

    let io = this.firstListen

    if (!io) return callback(new Error("No signaling connection available for dialing"))

    io = io.io //because undefined has no .io property

    io.ss.emit("ss-dial", outstream, {
      dialTo: ma.toString(),
      dialId
    })

    io.ss.once("dial." + dialId, (instream, data) => {
      if (data.err) return callback(new Error(data.err))
      const inpull = toPull.source(instream)
      conn.resolve({
        sink: outpull,
        source: inpull
      })
      return callback(null, conn)
    })

    return conn
  }

  createListener(options, handler) {
    if (typeof options === 'function') {
      handler = options
      options = {}
    }

    const listener = new EE()

    listener.listen = (ma, callback) => {
      callback = callback ? once(callback) : noop

      this.maSelf = ma

      const sioUrl = cleanUrlSIO(ma)

      log('Dialing to Signalling Server on: ' + sioUrl)

      listener.io = io.connect(sioUrl, sioOptions)
      this.firstListen = listener.io

      listener.io.ss = ss(listener.io)

      listener.io.once('connect_error', callback)
      listener.io.once('error', (err) => {
        listener.emit('error', err)
        listener.emit('close')
      })

      listener.io.ss.on("ss-incomming", incommingDial)
      listener.io.on('ws-peer', this._peerDiscovered)

      listener.io.on('connect', () => {
        listener.io.emit('ss-join', ma.toString())
      })

      listener.io.once('connect', () => {
        listener.emit('listening')
        callback()
      })

      function incommingDial(stream, info) {

        const outstream = ss.createStream()
        const outpull = toPull.sink(outstream)
        const instream = stream
        const inpull = toPull.source(instream)
        const dialId = info.dialId
        log("recieved dial from %s", info.dialFrom)

        const conn = new Connection({ //that's it. conn via socket.io mind=blown
          sink: outpull,
          source: inpull
        })

        listener.io.ss.emit("ss-dial-accept", stream, { //signaling will now connect the streams
          dialId
        })

        listener.io.once("dial." + dialId, err => {
          if (err) return
          listener.emit("connection", conn)
        })
      }
    }

    listener.close = (callback) => {
      callback = callback ? once(callback) : noop

      listener.io.emit('ss-leave')

      setImmediate(() => {
        listener.emit('close')
        callback()
      })
    }

    listener.getAddrs = (callback) => {
      setImmediate(() => callback(null, [this.maSelf]))
    }

    this.listenersRefs[multiaddr.toString()] = listener
    return listener
  }

  filter(multiaddrs) {
    if (!Array.isArray(multiaddrs)) {
      multiaddrs = [multiaddrs]
    }
    return multiaddrs.filter((ma) => mafmt.WebRTCStar.matches(ma))
  }

  _peerDiscovered(maStr) {
    log('Peer Discovered:', maStr)
    const split = maStr.split('/ipfs/')
    const peerIdStr = split[split.length - 1]
    const peerId = PeerId.createFromB58String(peerIdStr)
    const peerInfo = new PeerInfo(peerId)
    peerInfo.multiaddrs.add(multiaddr(maStr))
    this.discovery.emit('peer', peerInfo)
  }
}
module.exports = WebsocketStar
