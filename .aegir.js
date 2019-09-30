'use strict'

const rendezvous = require('libp2p-websocket-star-rendezvous')

let _r = []
let f = true // first run. used so metric gets only enabled once otherwise it crashes

async function boot () {
  const base = (v) => Object.assign({
    host: '0.0.0.0',
    cryptoChallenge: false,
    strictMultiaddr: false,
    refreshPeerListIntervalMS: 1000
  }, v)

  const rendezousList = [
    ['r1', { port: 15001, metrics: f }],
    ['r2', { port: 15002 }],
    ['r3', { port: 15003, host: '::' }],
    ['r4', { port: 15004, cryptoChallenge: true }]
  ]

  _r = await Promise.all(rendezousList.map((v) => rendezvous.start(base(v.pop()))))

  if (f) f = false
}

async function stop () {
  await Promise.all(_r.map((r) => r.stop()))
  _r = []
}

module.exports = {
  hooks: {
    pre: boot,
    post: stop
  }
}
