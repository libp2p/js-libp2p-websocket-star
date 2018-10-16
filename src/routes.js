'use strict'

/* eslint-disable standard/no-callback-literal */
// Needed because JSON.stringify(Error) returns "{}"

const SocketIO = require('socket.io')
const sp = require('socket.io-pull-stream')
const util = require('./utils')
const uuid = require('uuid')
const client = require('prom-client')
const fake = {
  gauge: {
    set: () => {}
  },
  counter: {
    inc: () => {}
  }
}

module.exports = (config, http) => {
  const log = config.log
  const io = new SocketIO(http.listener)
  const proto = new util.Protocol(log)
  const getConfig = () => config

  proto.addRequest('ss-join', ['multiaddr', 'string', 'function'], join)
  proto.addRequest('ss-leave', ['multiaddr'], leave)
  proto.addRequest('disconnect', [], disconnect)
  proto.addRequest('ss-dial', ['multiaddr', 'multiaddr', 'string', 'function'], dial) // dialFrom, dialTo, dialId, cb
  io.on('connection', handle)

  log('create new server', config)

  this._peers = {}
  const nonces = {}

  const peersMetric = config.metrics ? new client.Gauge({ name: 'rendezvous_peers', help: 'peers online now' }) : fake.gauge
  const dialsSuccessTotal = config.metrics ? new client.Counter({ name: 'rendezvous_dials_total_success', help: 'sucessfully completed dials since server started' }) : fake.counter
  const dialsFailureTotal = config.metrics ? new client.Counter({ name: 'rendezvous_dials_total_failure', help: 'failed dials since server started' }) : fake.counter
  const dialsTotal = config.metrics ? new client.Counter({ name: 'rendezvous_dials_total', help: 'all dials since server started' }) : fake.counter
  const joinsSuccessTotal = config.metrics ? new client.Counter({ name: 'rendezvous_joins_total_success', help: 'sucessfully completed joins since server started' }) : fake.counter
  const joinsFailureTotal = config.metrics ? new client.Counter({ name: 'rendezvous_joins_total_failure', help: 'failed joins since server started' }) : fake.counter
  const joinsTotal = config.metrics ? new client.Counter({ name: 'rendezvous_joins_total', help: 'all joins since server started' }) : fake.counter

  const getPeers = () => this._peers // it's a function because, and I'm not kidding, the value of that var is different for every peer that has joined
  const refreshMetrics = () => peersMetric.set(Object.keys(getPeers()).length)

  this.peers = () => getPeers()

  function safeEmit (addr, event, arg) {
    const peer = getPeers()[addr]
    if (!peer) {
      log('trying to emit %s but peer is gone', event)
      return
    }

    peer.emit(event, arg)
  }

  function handle (socket) {
    socket.addrs = []
    socket.cleanaddrs = {}
    sp(socket, {
      codec: 'buffer'
    })
    proto.handleSocket(socket)
  }

  // join this signaling server network
  function join (socket, multiaddr, pub, cb) {
    const log = socket.log = config.log.bind(config.log, '[' + socket.id + ']')

    if (getConfig().strictMultiaddr && !util.validateMa(multiaddr)) {
      joinsTotal.inc()
      joinsFailureTotal.inc()
      return cb('Invalid multiaddr')
    }

    if (getConfig().cryptoChallenge) {
      if (!pub.length) {
        joinsTotal.inc()
        joinsFailureTotal.inc()
        return cb('Crypto Challenge required but no Id provided')
      }

      if (!nonces[socket.id]) {
        nonces[socket.id] = {}
      }

      if (nonces[socket.id][multiaddr]) {
        log('response cryptoChallenge', multiaddr)

        nonces[socket.id][multiaddr].key.verify(
          Buffer.from(nonces[socket.id][multiaddr].nonce),
          Buffer.from(pub, 'hex'),
          (err, ok) => {
            if (err || !ok) {
              joinsTotal.inc()
              joinsFailureTotal.inc()
            }
            if (err) { return cb('Crypto error') } // the errors NEED to be a string otherwise JSON.stringify() turns them into {}
            if (!ok) { return cb('Signature Invalid') }

            joinFinalize(socket, multiaddr, cb)
          })
      } else {
        joinsTotal.inc()
        const addr = multiaddr.split('ipfs/').pop()

        log('do cryptoChallenge', multiaddr, addr)

        util.getIdAndValidate(pub, addr, (err, key) => {
          if (err) { joinsFailureTotal.inc(); return cb(err) }
          const nonce = uuid() + uuid()

          socket.once('disconnect', () => {
            delete nonces[socket.id]
          })

          nonces[socket.id][multiaddr] = { nonce: nonce, key: key }
          cb(null, nonce)
        })
      }
    } else {
      joinsTotal.inc()
      joinFinalize(socket, multiaddr, cb)
    }
  }

  function joinFinalize (socket, multiaddr, cb) {
    const log = getConfig().log.bind(getConfig().log, '[' + socket.id + ']')
    getPeers()[multiaddr] = socket
    if (!socket.stopSendingPeersIntv) socket.stopSendingPeersIntv = {}
    joinsSuccessTotal.inc()
    refreshMetrics()
    socket.addrs.push(multiaddr)
    log('registered as', multiaddr)

    // discovery

    let refreshInterval = setInterval(sendPeers, getConfig().refreshPeerListIntervalMS)

    socket.once('disconnect', stopSendingPeers)

    sendPeers()

    function sendPeers () {
      const list = Object.keys(getPeers())
      log(multiaddr, 'sending', (list.length - 1).toString(), 'peer(s)')
      list.forEach((mh) => {
        if (mh === multiaddr) {
          return
        }

        safeEmit(mh, 'ws-peer', multiaddr)
      })
    }

    function stopSendingPeers () {
      if (refreshInterval) {
        log(multiaddr, 'stop sending peers')
        clearInterval(refreshInterval)
        refreshInterval = null
      }
    }

    socket.stopSendingPeersIntv[multiaddr] = stopSendingPeers

    cb()
  }

  function leave (socket, multiaddr) {
    if (getPeers()[multiaddr] && getPeers()[multiaddr].id === socket.id) {
      socket.log('leaving', multiaddr)
      delete getPeers()[multiaddr]
      socket.addrs = socket.addrs.filter(m => m !== multiaddr)
      if (socket.stopSendingPeersIntv[multiaddr]) {
        socket.stopSendingPeersIntv[multiaddr]()
        delete socket.stopSendingPeersIntv[multiaddr]
      }
      refreshMetrics()
    }
  }

  function disconnect (socket) {
    socket.log('disconnected')
    Object.keys(getPeers()).forEach((mh) => {
      if (getPeers()[mh].id === socket.id) {
        leave(socket, mh)
      }
    })
  }

  function dial (socket, from, to, dialId, cb) {
    const log = socket.log
    const s = socket.addrs.filter((a) => a === from)[0]

    dialsTotal.inc()

    if (!s) {
      dialsFailureTotal.inc()
      return cb('Not authorized for this address')
    }

    log(from, 'is dialing', to)
    const peer = getPeers()[to]

    if (!peer) {
      dialsFailureTotal.inc()
      return cb('Peer not found')
    }

    socket.createProxy(dialId + '.dialer', peer)

    peer.emit('ss-incomming', dialId, from, err => {
      if (err) {
        dialsFailureTotal.inc()
        return cb(err)
      }

      dialsSuccessTotal.inc()
      peer.createProxy(dialId + '.listener', socket)
      cb()
    })
  }

  return this
}
