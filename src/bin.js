#!/usr/bin/env node

'use strict'

const signalling = require('./index')
const argv = require('minimist')(process.argv.slice(2))

let server

/* eslint-disable no-console */

signalling.start({
  port: argv.port || argv.p || process.env.PORT || 9090,
  host: argv.host || argv.h || process.env.HOST || '0.0.0.0',
  cryptoChallenge: !(argv.disableCryptoChallenge || process.env.DISABLE_CRYPTO_CHALLENGE),
  strictMultiaddr: !(argv.disableStrictMultiaddr || process.env.DISABLE_STRICT_MULTIADDR),
  metrics: true
}, (err, _server) => {
  if (err) {
    throw err
  }
  server = _server

  console.log('Listening on:', server.info.uri)
})

process.on('SIGINT', () => {
  server.stop((e) => {
    console.log('Rendezvous server stopped')
    process.exit(e ? 2 : 0)
  })
})

/* eslint-enable no-console */
