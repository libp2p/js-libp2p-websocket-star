'use strict'

const debug = require('debug')
const log = debug('libp2p:websocket-star')
const EE = require('events').EventEmitter
const Id = require('peer-id')
const Peer = require('peer-info')
const Connection = require('interface-connection').Connection
const setImmediate = require('async/setImmediate')
const Listener = require('./listener')
const mafmt = require('mafmt')
const assert = require('assert')

module.exports = class WebsocketStar {
  /**
    * WebsocketStar Transport
    * @class
    * @param {Object} options - Options for the listener
    * @param {PeerId} options.id - Id for the crypto challenge
    */
  constructor (options) {
    options = options || {}

    log('creating new WebsocketStar transport')

    this.id = options.id
    assert(this.id, 'Id MUST be set since v2')
    this.b58 = this.id.toB58String()
    this.flag = options.allowJoinWithDisabledChallenge // let's just refer to it as "flag"

    this.discovery = new EE()
    this.discovery.start = (callback) => {
      setImmediate(callback)
    }
    this.discovery.stop = (callback) => {
      setImmediate(callback)
    }

    this.listeners_list = {}
    this._peerDiscovered = this._peerDiscovered.bind(this)
  }

  setSwarm (swarm) {
    this.swarm = swarm
  }

  /**
    * Dials a peer - should actually never get called because p2p-circuit handles dials
    * @param {Multiaddr} ma - Multiaddr to dial to
    * @param {Object} options
    * @param {function} callback
    * @private
    * @returns {Connection}
    */
  dial (ma, options, callback) {
    callback(new Error('This should never have been called!'))
    return new Connection()
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

    const listener = new Listener(this, handler)

    listener.on('peers', peers => peers.forEach(peer => this._peerDiscovered(peer, listener)))

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
    * @param {id} id - Buffer containing id
    * @param {Listener} listener - Listener which discovered this peer
    * @fires Discovery#peer
    * @returns {undefined}
    * @private
    */
  _peerDiscovered (id, listener) {
    // TODO: exclude self
    log('Peer Discovered:', id)
    const peer = new Peer(new Id(id))

    peer.multiaddrs.add(listener.getFullAddr(peer.id.toB58String()))
    this.discovery.emit('peer', peer)
  }
}
