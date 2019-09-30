'use strict'

const assert = require('assert')
const debug = require('debug')
const log = debug('libp2p:websocket-star')

const withIs = require('class-is')
const { EventEmitter } = require('events')
const errCode = require('err-code')

const multiaddr = require('multiaddr')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const mafmt = require('mafmt')

const { cleanUrlSIO } = require('./utils')
const Listener = require('./listener')
const toConnection = require('./socket-to-conn')
const { CODE_CIRCUIT, CODE_P2P } = require('./constants')

/**
 * @class WebsocketStar
 */
class WebsocketStar {
  /**
    * @constructor
    * @param {Object} options options
    * @param {Upgrader} options.upgrader connection upgrader
    * @param {PeerId} options.id id for the crypto challenge
    * @param {boolean} options.allowJoinWithDisabledChallenge
    */
  constructor ({ upgrader, id, allowJoinWithDisabledChallenge }) {
    assert(upgrader, 'An upgrader must be provided. See https://github.com/libp2p/interface-transport#upgrader.')
    this._upgrader = upgrader
    this.id = id
    this.flag = allowJoinWithDisabledChallenge // let's just refer to it as "flag"

    this.listenersRefs = {}

    // Discovery
    this.discovery = new EventEmitter()
    this.discovery.tag = 'websocketStar'
    this.discovery._isStarted = false
    this.discovery.start = () => {
      this.discovery._isStarted = true
    }
    this.discovery.stop = () => {
      this.discovery._isStarted = false
    }

    this._peerDiscovered = this._peerDiscovered.bind(this)
  }

  /**
    * Sets the id after transport creation (aka the lazy way)
    * @param {PeerId} id
    * @returns {void}
    */
  lazySetId (id) {
    if (!id) return
    this.id = id
    this.canCrypto = true
  }

  /**
    * @async
    * @param {Multiaddr} ma - Multiaddr to dial to
    * @param {Object} [options]
    * @param {AbortSignal} [options.signal] Used to abort dial requests
    * @returns {Connection} An upgraded connection
    */
  async dial (ma, options = {}) {
    log('dialing %s', ma)

    const url = cleanUrlSIO(ma)
    const listener = this.listenersRefs[url]

    if (!listener) {
      throw errCode(new Error('No listener for this server'), 'ERR_NO_LISTENER_AVAILABLE')
    }

    const socket = await listener.dial(ma, options)
    const maConn = toConnection(socket, { remoteAddr: ma, signal: options.signal })
    log('new outbound connection %s', maConn.remoteAddr)

    const conn = await this._upgrader.upgradeOutbound(maConn)
    log('outbound connection %s upgraded', maConn.remoteAddr)
    return conn
  }

  /**
    * Creates a listener
    * @param {Object} options
    * @param {function} handler
    * @returns {Listener}
    */
  createListener (options = {}, handler) {
    if (typeof options === 'function') {
      handler = options
      options = {}
    }

    const listener = new Listener({
      id: this.id,
      handler,
      listeners: this.listenersRefs,
      flag: this.flag
    })

    listener.on('peer', this._peerDiscovered)

    return listener
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid Websockets addresses
   * @param {Multiaddr[]} multiaddrs
   * @returns {Multiaddr[]} Valid Websockets multiaddrs
   */
  filter (multiaddrs) {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    return multiaddrs.filter((ma) => {
      if (ma.protoCodes().includes(CODE_CIRCUIT)) {
        return false
      }

      return mafmt.WebSocketStar.matches(ma.decapsulateCode(CODE_P2P))
    })
  }

  /**
    * @private
    * Used to fire peer events on the discovery part
    * @param {Multiaddr} maStr
    * @fires Discovery#peer
    */
  _peerDiscovered (maStr) {
    log('Peer Discovered:', maStr)
    const peerIdStr = maStr.split('/p2p/').pop()
    const peerId = PeerId.createFromB58String(peerIdStr)
    const peerInfo = new PeerInfo(peerId)

    peerInfo.multiaddrs.add(multiaddr(maStr))
    this.discovery.emit('peer', peerInfo)
  }
}

module.exports = withIs(WebsocketStar, { className: 'WebsocketStar', symbolName: '@libp2p/js-libp2p-websocket-star/websocketstar' })
