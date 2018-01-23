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

  /**
    * Dials a peer
    * @param {Multiaddr} ma - Multiaddr to dial to
    * @param {Object} options
    * @param {function} callback
    * @returns {Connection}
    */
  dial (ma, options, callback) { // TODO: fallback to /p2p-circuit/DST if no relay for addr?
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    const listener = this.listeners_list[someUniqueId] // TODO: what could be used as uniqueId ?
    if (!listener) {
      callback(new Error('No listener for this server'))
      return new Connection()
    }

    // TODO: use direct dialing (`this.swarm.dial(peer)`)
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
    * @param {Multiaddr} maStr
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
