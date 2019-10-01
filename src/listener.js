'use strict'

const debug = require('debug')
const log = debug('libp2p:rawSebsocket-star:listener')

const { EventEmitter } = require('events')

const uuid = require('uuid')
const errCode = require('err-code')
const io = require('socket.io-client')
const sp = require('socket.io-pull-stream')
const once = require('once')

const crypto = require('libp2p-crypto')

const { cleanUrlSIO, Protocol } = require('./utils')
const ERRORS = require('./errors')

const noop = once(() => {})

const sioOptions = {
  transports: ['websocket'],
  'force new connection': true
}

/**
  * Listener for signalling server
  * @class
  * @param {Object} options - Options for the listener
  * @param {PeerId} options.id - Id for the crypto challenge
  * @param {function} options.handler - Incomming connection handler
  */
class Listener extends EventEmitter {
  constructor (options) {
    super()
    this.id = options.id
    this.log = log.bind(log, 'listener#offline')
    this.canCrypto = Boolean(options.id)
    this._handler = options.handler || noop
    this.listenersRefs = options.listeners || {}
    this.flag = options.flag
    this.conns = []
    this.connected = false
  }

  // public functions
  /**
    * Listens on a multiaddr
    * @param {Multiaddr} ma
    * @returns {Promise}
    */
  async listen (ma) {
    this.ma = ma
    this.server = cleanUrlSIO(ma)
    this.listenersRefs[this.server] = this

    if (this.connected) { // listener was .close()'d yet not all conns disconnected. we're still connected, so don't do anything
      this.closing = false
      return
    }

    await this._up()

    let peers, error

    try {
      peers = await this._crypto()
    } catch (err) {
      // Error connecting to WebSocket
      if (err.description && err.description.code === 'ENOTFOUND') {
        const hostname = err.description.hostname

        error = errCode(new Error(`WebSocket connection failed on ${hostname}`), ERRORS.ERR_WS_STAR_WEBSOCKET_CONNECTION)
      }

      this.log('error', error)
      if (!(error instanceof Error)) error = new Error(error)
      this._down()
      this.emit('error', error)
      this.emit('close')

      throw error
    }

    this.log('success')
    this.connected = true

    this.io.on('reconnect', async () => {
      // force to get a new signature
      this.signature = null

      let reconnectPeers

      try {
        reconnectPeers = await this._crypto()
      } catch (err) {
        error = err
        this.log('reconnect error', err)
        this.emit('error', err)
      }

      if (!error) {
        this.log('reconnected')
        for (const p of (reconnectPeers || [])) {
          this.emit('peer', p)
        }
      }
    })

    this.emit('listening')

    for (const p of (peers || [])) {
      this.emit('peer', p)
    }
  }

  /**
    * Gets the addresses the listener listens on
    * @returns {Multiaddr[]}
    */
  getAddrs () {
    return this.ma ? [this.ma] : []
  }

  get activeConnections () {
    this.conns = this.conns.filter(c => c.sink || c.source)
    return Boolean(this.conns.length)
  }

  maybeClose () {
    if (!this.activeConnections && this.closing) {
      this.connected = false
      this.closing = false
      this.log('no more connections and listener is offline - closing')
      this._down()
    }
  }

  close () {
    this.closing = true // will close once the last connection quits
    this.maybeClose()
  }

  // called from transport
  /**
    * Dials a peer
    * @param {Multiaddr} ma - Multiaddr to dial to
    * @param {Object} [options]
    * @param {AbortSignal} [options.signal] Used to abort dial requests
    * @returns {Promise<Socket>}
    */
  dial (ma, options = {}) {
    const dialId = uuid()
    const dlog = this.log.bind(log, 'dial#' + dialId)
    const io = this.io

    if (!io) {
      throw new Error('Not listening')
    }

    return new Promise((resolve, reject) => {
      const sink = io.createSink(dialId + '.dialer')

      // "multiaddr", "multiaddr", "string", "function" - dialFrom, dialTo, dialId, cb
      io.emit('ss-dial', this.ma.toString(), ma.toString(), dialId, (err) => {
        console.log('2')
        if (err) {
          return reject(err instanceof Error ? err : new Error(err))
        }

        dlog(err ? 'error: ' + err.toString() : 'success')
        const source = io.createSource(dialId + '.listener')

        const rawSocket = {
          sink: sink,
          source: source
        }

        resolve(rawSocket)
      })
    })
  }

  // "private" functions
  /**
    * Connects to the signalling server
    * @returns {Promise}
    * @private
    */
  _up () {
    if (this.io) {
      return
    }

    this.log = log.bind(log, 'listener#' + this.server)
    this.log('dialing to signalling server')

    return new Promise((resolve, reject) => {
      const _io = this.io = io.connect(this.server, sioOptions)

      sp(_io, { codec: 'buffer' })
      _io.once('error', reject)
      _io.once('connect_error', reject)
      _io.once('connect', resolve)

      const proto = new Protocol(this.log)

      proto.addRequest('ws-peer', ['multiaddr'], (socket, peer) => this.emit('peer', peer))
      proto.addRequest('ss-incomming', ['string', 'multiaddr', 'function'], this._incomingDial.bind(this))
      proto.handleSocket(_io)
    })
  }

  /**
    * Disconnects from signalling server
    * @returns {undefined}
    * @private
    */
  _down () {
    if (!this.io) {
      return
    }

    this.io.disconnect()
    this.emit('close')
    delete this.io
  }

  /**
    * Performs a cryptoChallenge
    * @returns {Promise}
    * @private
    */
  _cryptoChallenge () {
    if (!this.io) {
      throw new Error('Not connected')
    }

    const pubKeyStr = this.canCrypto ? crypto.keys.marshalPublicKey(this.id.pubKey).toString('hex') : ''

    const maStr = this.ma.toString()

    return new Promise((resolve, reject) => {
      this.io.emit('ss-join', maStr, pubKeyStr, (err, sig, peers) => {
        if (err) { return reject(err) }

        if (sig) {
          if (!this.canCrypto) {
            this._down()
            return reject(new Error('Can\'t sign cryptoChallenge: No id provided'))
          }

          this.log('performing cryptoChallenge')

          this.id.privKey.sign(Buffer.from(sig), (err, signature) => {
            if (err) {
              return reject(err)
            }
            this.signature = signature.toString('hex')
            return this._join()
          })
        } else {
          if (!this.flag) {
            this._down()
            return reject(new Error('Tried to listen on a server with crypto challenge disabled!\n    This is prohibited by default and can lead to security issues!\n    Please set "allowJoinWithDisabledChallenge" to true in the constructor options (but only if you know what you are doing)!'))
          }
          this.signature = '_'

          resolve(peers)
        }
      })
    })
  }

  /**
    * Performs a cryptoChallenge when no signature is found
    * @returns {Promise}
    * @private
    */
  _crypto () {
    this.log('joining')

    if (!this.io) {
      throw new Error('Not connected')
    }

    if (this.signature) {
      return this._join()
    } else {
      return this._cryptoChallenge()
    }
  }

  /**
    * Emits ss-join with the multiaddr and signature
    * @returns {Promise}
    * @private
    */
  _join () {
    return new Promise((resolve, reject) => {
      this.io.emit('ss-join', this.ma.toString(), this.signature, (err, res) => {
        if (err) {
          return reject(err)
        }
        resolve(res)
      })
    })
  }

  /**
    * Handles incomming dials
    * @listens ss-incomming
    * @param {socket.io_client} socket
    * @param {string} dialId - Unique id for this dial
    * @param {string} dialFrom - Multiaddr as string
    * @returns {void}
    * @private
    */
  _incomingDial (socket, dialId, dialFrom) {
    this.log('dial#' + dialId + ' incomming from', dialFrom)
    // const ma = multiaddr(dialFrom)
    const source = this.io.createSource(dialId + '.dialer')
    const sink = this.io.createSink(dialId + '.listener')

    const rawSocket = {
      sink: sink,
      source: source
    }
    // const rawSocket = ss(socket)

    this._handler(rawSocket)
    this.emit('connection', rawSocket)
  }
}

module.exports = Listener
