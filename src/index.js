'use strict'

const assert = require('assert')
const debug = require('debug')
const log = debug('libp2p:websocket-star')
const multiaddr = require('multiaddr')
const { EventEmitter } = require('events')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const mafmt = require('mafmt')
const { Connection } = require('interface-connection')
// const setImmediate = require('async/setImmediate')

const { cleanUrlSIO } = require('./utils')
const Listener = require('./listener')
const withIs = require('class-is')

/**
 * @class WebsocketStar
 */
class WebsocketStar {
  /**
    * @constructor
    * @param {Object} options options
    * @param {Upgrader} options.upgrader connection upgrader
    * @param {PeerId} options.id id for the crypto challenge
    */
  constructor (options = {}) {
    assert(options.upgrader, 'An upgrader must be provided. See https://github.com/libp2p/interface-transport#upgrader.')
    this._upgrader = options.upgrader
    this.id = options.id
    this.flag = options.allowJoinWithDisabledChallenge // let's just refer to it as "flag"

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
    * Dials a peer
    * @param {Multiaddr} ma - Multiaddr to dial to
    * @param {Object} options
    * @param {function} callback
    * @returns {Connection}
    */
  dial (ma, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    let url
    try {
      url = cleanUrlSIO(ma)
    } catch (err) {
      return callback(err) // early
    }
    const listener = this.listenersRefs[url]
    if (!listener) {
      callback(new Error('No listener for this server'))
      return new Connection()
    }
    return listener.dial(ma, options, callback)
  }

  /**
    * Creates a listener
    * @param {Object} options
    * @param {function} handler
    * @returns {Listener}
    */
  createListener (options, handler) {
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
    * Filters multiaddrs
    * @param {Multiaddr[]} multiaddrs
    * @returns {boolean}
    */
  filter (multiaddrs) {
    if (!Array.isArray(multiaddrs)) {
      multiaddrs = [multiaddrs]
    }

    return multiaddrs.filter((ma) => mafmt.WebSocketStar.matches(ma))
  }

  /**
    * Used to fire peer events on the discovery part
    * @param {Multiaddr} maStr
    * @fires Discovery#peer
    * @returns {undefined}
    * @private
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
