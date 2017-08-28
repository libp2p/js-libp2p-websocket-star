'use strict'

const config = require('../config')
const log = config.log
const SocketIO = require('socket.io')
const ss = require("socket.io-stream")

module.exports = (http) => {
  const io = new SocketIO(http.listener)
  io.on('connection', handle)

  const peers = {}

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
    socket.on('ss-join', ma => join(socket, ma))
    socket.on('ss-leave', ma => leave(socket, ma))
    socket.on('disconnect', () => disconnect(socket)) // socket.io own event
    socket.ss = ss(socket)
    socket.ss.on("ss-dial", (stream, data) => dialHandle(socket, stream, data))
  }

  // join this signaling server network
  function join(socket, multiaddr) {
    peers[multiaddr] = socket // socket
    let refreshInterval = setInterval(sendPeers, config.refreshPeerListIntervalMS)

    socket.once('ss-leave', stopSendingPeers)
    socket.once('disconnect', stopSendingPeers)

    sendPeers()

    function sendPeers() {
      Object.keys(peers).forEach((mh) => {
        if (mh === multiaddr) {
          return
        }
        safeEmit(mh, 'ws-peer', multiaddr)
      })
    }

    function stopSendingPeers() {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
      }
    }
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

  function dialHandle(socket, c_out_stream, data) { //c_out = client output
    const to = data.dialTo
    const dialId = data.dialId
    const peer = peers[to]
    if (!peer) return socket.ss.emit(ss.createStream(), {
      err: "Peer not found"
    })
    const c_out_bridge = ss.createStream() //i don't know how robust the module is
    c_out_stream.pipe(c_out_bridge)
    peer.ss.emit("ss-incomming", c_out_bridge, {
      dialId,
      dialFrom: data.dialFrom //TODO: make this more secure or remove this
    })
    peer.ss.once("dial.accept." + dialId, (s_out_stream /*,data*/ ) => {
      const s_out_bridge = ss.createStream()
      s_out_stream.pipe(s_out_bridge)
      socket.ss.emit("dial." + dialId, s_out_bridge, {
        dialId
      })
      socket.once("dial.accept." + dialId, err => {
        peer.emit("dial." + dialId, err)
      })
    })
  }

  return this
}
