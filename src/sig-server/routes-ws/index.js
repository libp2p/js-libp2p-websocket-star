"use strict"

const SocketIO = require('socket.io')
const sp = require("../../socket-pull")
const util = require("../../utils")
const multiaddr = require("multiaddr")

module.exports = (config, http) => {
  const log = config.log
  const io = new SocketIO(http.listener)
  const proto = new util.Protocol(config.log)
  proto.addRequest("ss-join", ["multiaddr", "string", "function"], join)
  proto.addRequest("ss-leave", ["multiaddr"], leave)
  proto.addRequest("disconnect", [], disconnect)
  proto.addRequest("ss-dial", ["multiaddr", "multiaddr", "string", "function"], dial) //dialFrom, dialTo, dialId, cb
  io.on('connection', handle)

  log("create new server", config)

  const peers = {}
  let peersMulti = [] //with the new crypto challenge every address hash a hash appended. but if there is only one we can (for now) just dial to it TODO: rethink

  this.peers = () => {
    return peers
  }

  function safeEmit(addr, event, arg) {
    const peer = peers[addr]
    if (!peer) {
      log('trying to emit %s but peer is gone', event)
      return
    }

    peer.emit(event, arg)
  }

  function handle(socket) {
    socket.addrs = []
    socket.cleanaddrs = {}
    sp(socket)
    proto.handleSocket(socket)
  }

  // join this signaling server network
  function join(socket, crypto_ma, challenge, cb) { //ma format /libp2p-webrtc-star/-server_address-/ipfs/-ipfs_id-/ipfs/-hash_challenge-
    //crypto challenge
    const hash = util.b58encode(util.sha5(util.sha5(challenge)))
    const sent_hash = crypto_ma.split("/").pop()
    let ma
    if (config.cryptoChallenge) {
      if (hash != sent_hash) return cb("Challenge failed")
      //get real addr
      ma = multiaddr(crypto_ma).decapsulate("ipfs").toString()
    } else {
      //get real addr only if ipfs is in there twice
      if (crypto_ma.split("/ipfs").length === 3)
        ma = multiaddr(crypto_ma).decapsulate("ipfs").toString()
      else
        ma = crypto_ma
    }

    log("registered peer %s as %s with hash %s", ma, socket.id, sent_hash)

    socket.addrs.push(crypto_ma)
    socket.cleanaddrs[crypto_ma] = ma

    if (!peersMulti[ma])
      peersMulti[ma] = []

    peersMulti[ma].push(socket)

    if (peers[crypto_ma] && peers[crypto_ma].id != socket.id) return cb("Already taken")

    peers[crypto_ma] = socket

    //discovery

    let refreshInterval = setInterval(sendPeers, config.refreshPeerListIntervalMS)

    socket.once('ss-leave', function handleLeave(sent_ma) {
      if (sent_ma == crypto_ma)
        stopSendingPeers()
      else
        socket.once("ss-leave", handleLeave)
    })
    socket.once('disconnect', stopSendingPeers)

    sendPeers()

    function sendPeers() {
      if (peersMulti[ma]) {
        peersMulti[ma] = peersMulti[ma].filter(s => s.id != socket.id)
        if (!peersMulti[ma].length) delete peersMulti[ma]
      }
      Object.keys(peers).forEach((mh) => {
        if (mh === crypto_ma || mh.startsWith(ma)) {
          return
        }
        safeEmit(crypto_ma, 'ws-peer', mh, peers[mh].cleanaddrs[mh])
      })
    }

    function stopSendingPeers() {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
      }
    }

    cb()
  }

  function leave(socket, multiaddr) {
    if (peers[multiaddr]) {
      delete peers[multiaddr]
    }
  }

  function disconnect(socket) {
    Object.keys(peers).forEach((mh) => {
      if (peers[mh].id === socket.id) {
        delete peers[mh]
      }
    })
  }

  function dial(socket, from, to, dialId, cb) {
    const log = config.log.bind(config.log, "[" + dialId + "]")
    const s = socket.addrs.filter(a => a == from)[0]
    if (!s) return cb("Not authorized for this address")
    const cleanAddr = socket.cleanaddrs[from]
    log(from, "is dialing", to)
    let peer = peers[to]
    if (!peer && peersMulti[to]) {
      if (peersMulti[to].length != 1)
        cb("Multiple instances of the requested address online")
      else
        peer = peersMulti[to][0]
    }
    if (!peer) return cb("Peer not found")
    socket.createProxy(dialId + ".dialer", peer)
    peer.emit("ss-incomming", dialId, from, cleanAddr, err => {
      if (err) return cb(err)
      else {
        peer.createProxy(dialId + ".listener", socket)
        return cb()
      }
    })
  }

  return this
}
