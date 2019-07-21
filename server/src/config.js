'use strict'

const debug = require('debug')
const log = debug('libp2p-websocket-star-rendezvous')
log.error = debug('libp2p-websocket-star-rendezvous:error')

module.exports = {
  log: log,
  hapi: {
    port: process.env.PORT || 13579,
    host: '0.0.0.0',
    options: {
      routes: {
        cors: true
      }
    }
  },
  refreshPeerListIntervalMS: 10000,
  cryptoChallenge: true,
  strictMultiaddr: false,
  metrics: false
}
