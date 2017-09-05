"use strict"

const debug = require('debug')
const log = debug('libp2p:websocket-star')
const multiaddr = require('multiaddr')
const mafmt = require('mafmt')
const io = require('socket.io-client')
const sp = require("socket.io-pull-stream")
const uuid = require("uuid")
const EE = require('events').EventEmitter
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const Connection = require('interface-connection').Connection
const once = require('once')
const setImmediate = require('async/setImmediate')
const utils = require('./utils')
const cleanUrlSIO = utils.cleanUrlSIO
const crypto = require("libp2p-crypto")

const noop = once(() => {})

const sioOptions = {
  transports: ['websocket'],
  'force new connection': true
}

class WebsocketStar {
  constructor(options) {
    options = options || {}

    this.id = options.id
    this.canCrypto = !!options.id

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

    this.ios = {}
    this._peerDiscovered = this._peerDiscovered.bind(this)
  }

  dial(ma, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    const _ma = multiaddr(ma)

    const conn = new Connection(null)

    const dialId = uuid()

    callback = callback ? once(callback) : noop

    let io = this.ios[utils.cleanUrlSIO(ma)]

    if (!io) return callback(new Error("No signaling connection available for dialing"))

    const sink = io.createSink(dialId + ".dialer")

    log("dialing %s (id %s)", ma, dialId)

    //"multiaddr", "multiaddr", "string", "function" - dialFrom, dialTo, dialId, cb
    io.emit("ss-dial", io.maSelf.toString(), ma.toString(), dialId, err => {
      if (err) return callback(new Error(err))
      log("dialing %s (id %s) successfully completed", ma, dialId)
      const source = io.createSource(dialId + ".listener")
      conn.setInnerConn({
        sink,
        source
      }, {
        getObservedAddrs: cb => cb(null, [_ma])
      })
      callback(null, conn)
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
      let _cb = callback ? once(callback) : noop
      callback = err => {
        if (err) {
          listener.emit('error', err)
          listener.io.disconnect()
        }
        return _cb(err)
      }

      const sioUrl = cleanUrlSIO(ma)

      log('Dialing to Signalling Server on: ' + sioUrl)

      listener.io = io.connect(sioUrl, sioOptions)
      this.ios[sioUrl] = listener.io
      listener.io.maSelf = ma

      const proto = new utils.Protocol(log)
      proto.addRequest("ws-peer", ["multiaddr"], this._peerDiscovered.bind(this))
      proto.addRequest("ss-incomming", ["string", "multiaddr", "function"], incommingDial)
      proto.handleSocket(listener.io)

      listener.io.once('connect_error', callback)
      listener.io.once('error', (err) => {
        listener.emit('error', err)
        listener.emit('close')
      })

      sp(listener.io)

      listener.io.once('connect', () => {
        listener.io.on('connect', () =>
          listener.io.emit('ss-join', ma.toString(), listener.signature, err => err ? listener.emit("error", new Error(err)) : listener.emit("reconnected")))
        listener.io.emit('ss-join', ma.toString(), this.canCrypto ? crypto.keys.marshalPublicKey(this.id.pubKey).toString("hex") : "", (err, sig) => {
          if (err) {
            callback(new Error(err))
          } else {
            if (sig) {
              if (!this.canCrypto) {
                io.disconnect()
                callback(new Error("Can't sign cryptoChallenge: No id provided"))
              } else {
                this.id.privKey.sign(Buffer.from(sig), (err, signature) => {
                  if (err) callback(err)
                  listener.signature = signature.toString("hex")
                  listener.io.emit('ss-join', ma.toString(), signature.toString("hex"), err => {
                    if (err) {
                      callback(new Error(err))
                    } else {
                      listener.emit('listening')
                      callback()
                    }
                  })
                })
              }
            } else {
              listener.signature = ""
              listener.emit('listening')
              callback()
            }
          }
        })
      })

      function incommingDial(socket, dialId, dialFrom, cb) {
        log("recieved dial from", dialFrom, dialId)
        const ma = multiaddr(dialFrom)
        const source = listener.io.createSource(dialId + ".dialer")
        const sink = listener.io.createSink(dialId + ".listener")

        cb(null)
        const conn = new Connection({
          sink,
          source
        }, {
          getObservedAddrs: cb => cb(null, [ma])
        })
        listener.emit("connection", conn)
        handler(conn)
      }
    }

    listener.close = (callback) => {
      callback = callback ? once(callback) : noop

      listener.io.disconnect() //disconnecting unregisters all addresses
      listener.emit('close')
      callback()

    }

    listener.getAddrs = (callback) => {
      setImmediate(() => callback(null, [listener.io.maSelf]))
    }

    return listener
  }

  filter(multiaddrs) {
    if (!Array.isArray(multiaddrs))
      multiaddrs = [multiaddrs]
    return multiaddrs.filter((ma) => mafmt.WebSocketStar.matches(ma))
  }

  _peerDiscovered(socket, maStr) {
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
