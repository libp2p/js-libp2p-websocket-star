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
const duplex = require("duplexer")

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

    const outstream = ss.createStream() //the stream is converted to a source on the other end by socket.io-stream
    const dialId = uuid()

    callback = callback ? once(callback) : noop

    let io = this.firstListen

    if (!io) return callback(new Error("No signaling connection available for dialing"))

    log("dialing %s (id %s)", ma, dialId)

    //ss-dial -> server -> dial.ID -> dial.accept.ID

    ss(io).emit("ss-dial", outstream, {
      dialTo: ma.toString(),
      dialFrom: this.maSelf.toString(),
      dialId
    })

    ss(io).once("dial." + dialId, (instream, data) => {
      if (data.err) return callback(new Error(data.err))
      log("dialing %s (id %s) successfully completed", ma, dialId)
      io.emit("dial.accept." + dialId)
      conn.conn.resolve(toPull.duplex(duplex(outstream, instream)))
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

      listener.io.once('connect_error', callback)
      listener.io.once('error', (err) => {
        listener.emit('error', err)
        listener.emit('close')
      })

      ss(listener.io).on("ss-incomming", incommingDial)
      listener.io.on('ws-peer', this._peerDiscovered)

      listener.io.on('connect', () => {
        listener.io.emit('ss-join', ma.toString())
      })

      listener.io.once('connect', () => {
        listener.emit('listening')
        callback()
      })

      function incommingDial(instream, info) {

        const outstream = ss.createStream()
        const dialId = info.dialId
        log("recieved dial from %s", info.dialFrom, dialId)

        //ss-incomming -> dial.accept.ID -> server -> dial.ID

        const conn = new Connection(toPull.duplex(duplex(outstream, instream)))

        ss(listener.io).emit("dial.accept." + dialId, outstream, { //signaling will now connect the streams
          dialId
        })

        listener.io.once("dial." + dialId, err => {
          if (err) return
          log("dial from %s is finished", info.dialFrom, dialId)
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
