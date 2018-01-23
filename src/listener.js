'use strict'

const debug = require('debug')
const log = debug('libp2p:websocket-star:listener')
const multiaddr = require('multiaddr')
const EE = require('events').EventEmitter
const once = require('once')
const setImmediate = require('async/setImmediate')

const pull = require('pull-stream')
const lp = require('pull-length-prefixed')
const Pushable = require('pull-pushable')

const {IdentifyRequest, IdentifyResponse, DiscoveryEvent, DiscoveryACK} = require('./proto') // TODO: move to client

const noop = once(() => {})

/**
  * Listener for signalling server
  * @class
  * @param {WebsocketStar} main - Instance of main class
  * @param {function} handler - Handler function
  */
module.exports = class Listener extends EE {
  constructor (main, handler) {
    this.handler = handler
    this.id = main.id
    this.listeners = main.listeners_list
    this.swarm = main.swarm
    this.source = Pushable()
    this._push = this.source.push.bind(this.source)
  }

  _disconnect (err) {
    this.source.abort(err)
    this.disconnected = err
    this.emit('disconnect', err)
    this.emit('close')
    if (typeof err !== 'boolean') return this.emit('error', err)
  }

  sink (read) {
    let first = true
    let second = false
    const next = (err, data) => {
      if (this.disconnected) return read(this.disconnected)
      if (err) {
        this._disconnect(err)
        return read(err)
      }
      // data is binary protobuf. first packet is IdentifyRequest, after that DiscoveryEvent
      try {
        if (first) {
          first = false
          second = true
          const request = this.identify = IdentifyRequest.decode(data)
          this.emit('identify', request)
        } else {
          const event = DiscoveryEvent.decode(data)
          if (second) {
            second = false
            this.emit('identifySuccess', event)
          }
          this.emit('peers', event.id)
        }
      } catch (e) {
        this._disconnect(e)
        return read(e)
      }

      read(null, next)
    }
  }

  /**
    * Listens on a multiaddr
    * @param {Multiaddr} ma
    * @param {function} callback
    * @returns {undefined}
    */
  listen (ma, callback) {
    callback = callback ? once(callback) : noop
    const {id} = this
    ma = multiaddr(ma)
    this.swarm.dial(ma, '/ws-star/2.0.0', (err, conn) => {
      if (err) return callback(err)
      pull(
        conn,
        lp.decode(),
        this,
        lp.encode(),
        conn
      )

      this.ma = ma
      this.relayAddr = ma.decapsulate('p2p-ws-star').encapsulate('p2p-circuit')

      this.once('identify', request => {
        id.privKey.sign(request.nonce, (err, signature) => {
          if (err) return callback(err)
          const json = id.toJSON()
          const response = {
            id: json.id,
            pubKey: json.pubKey,
            signature
          }
          this.response = response
          this._push(IdentifyResponse.encode(response))
          this.once('identifySuccess', callback)
          this.once('disconnect', callback)
        })
      })
    })
  }

  /**
    * Gets the addresses the listener listens on
    * @param {function} callback
    * @returns {undefined}
    */
  getAddrs (callback) {
    setImmediate(() => callback(null, this.ma ? [this.ma] : []))
  }

  /**
    * Closes the listener
    * @param {function} callback
    * @returns {undefined}
    */
  close (callback) {
    callback = callback ? once(callback) : noop

    this._down()

    callback()
  }

  /**
    * Get full address of peer
    * @param {String} id - base58-encoded ipfs id
    * @returns {multiaddr} full address
    */
  getFullAddr (id) {
    return this.relayAddr.encapsulate('ipfs', id)
  }
}
