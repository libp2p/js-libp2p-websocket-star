'use strict'

const SocketIO = require('socket.io')
const sp = require('socket.io-pull-stream')
const util = require('./utils')
const uuid = require('uuid')

module.exports = (config, http) => {
  const log = config.log
  const io = new SocketIO(http.listener)
  const proto = new util.Protocol(config.log)

  proto.addRequest('ss-join', ['multiaddr', 'string', 'function'], join)
  proto.addRequest('ss-leave', ['multiaddr'], leave)
  proto.addRequest('disconnect', [], disconnect)
  proto.addRequest('ss-dial', ['multiaddr', 'multiaddr', 'string', 'function'], dial) // dialFrom, dialTo, dialId, cb
  io.on('connection', handle)

  log('create new server', config)

  const peers = {}
  const nonces = {}

  this.peers = () => {
    return peers
  }

  function safeEmit (addr, event, arg) {
    const peer = peers[addr]
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
    const log = config.log.bind(config.log, '[' + socket.id + ']')

    if (config.strictMultiaddr && !util.validateMa(multiaddr)) {
      return cb(new Error('Invalid multiaddr'))
    }

    if (config.cryptoChallenge) {
      if (!pub.length) {
        return cb(new Error('Crypto Challenge required but no Id provided'))
      }

      if (!nonces[socket.id]) {
        nonces[socket.id] = {}
      }

      if (nonces[socket.id][multiaddr]) {
        log('response cryptoChallenge', multiaddr)

        nonces[socket.id][multiaddr].key.verify(nonces[socket.id][multiaddr].nonce, Buffer.from(pub, 'hex'), (err, ok) => {
          if (err) { return cb(new Error('Crypto error')) }
          if (!ok) { return cb(new Error('Signature Invalid')) }

          joinFinalize(socket, multiaddr, cb)
        })
      } else {
        const addr = multiaddr.split('ipfs/').pop()

        log('do cryptoChallenge', multiaddr, addr)

        util.getIdAndValidate(pub, addr, (err, key) => {
          if (err) return cb(err)
          const nonce = uuid() + uuid()

          socket.once('disconnect', () => {
            delete nonces[socket.id]
          })

          nonces[socket.id][multiaddr] = { nonce: nonce, key: key }
          cb(null, nonce)
        })
      }
    } else joinFinalize(socket, multiaddr, cb)
  }

  function joinFinalize (socket, multiaddr, cb) {
    const log = config.log.bind(config.log, '[' + socket.id + ']')
    peers[multiaddr] = socket
    socket.addrs.push(multiaddr)
    log('registered as', multiaddr)

    // discovery

    let refreshInterval = setInterval(sendPeers, config.refreshPeerListIntervalMS)

    socket.once('ss-leave', function handleLeave (ma) {
      if (ma === multiaddr) {
        stopSendingPeers()
      } else {
        socket.once('ss-leave', handleLeave)
      }
    })

    socket.once('disconnect', stopSendingPeers)

    sendPeers()

    function sendPeers () {
      Object.keys(peers).forEach((mh) => {
        if (mh === multiaddr) {
          return
        }

        safeEmit(mh, 'ws-peer', multiaddr)
      })
    }

    function stopSendingPeers () {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
      }
    }

    cb()
  }

  function leave (socket, multiaddr) {
    if (peers[multiaddr]) {
      delete peers[multiaddr]
    }
  }

  function disconnect (socket) {
    Object.keys(peers).forEach((mh) => {
      if (peers[mh].id === socket.id) {
        delete peers[mh]
      }
    })
  }

  function dial (socket, from, to, dialId, cb) {
    const log = config.log.bind(config.log, '[' + dialId + ']')
    const s = socket.addrs.filter((a) => a === from)[0]

    if (!s) {
      return cb(new Error('Not authorized for this address'))
    }

    log(from, 'is dialing', to)
    const peer = peers[to]

    if (!peer) {
      return cb(new Error('Peer not found'))
    }

    socket.createProxy(dialId + '.dialer', peer)

    peer.emit('ss-incomming', dialId, from, err => {
      if (err) {
        return cb(err)
      }

      peer.createProxy(dialId + '.listener', socket)
      cb()
    })
  }

  return this
}
