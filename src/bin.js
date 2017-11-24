#!/usr/bin/env node

'use strict'

const signalling = require('./index')
const argv = require('minimist')(process.argv.slice(2))

/* eslint-disable no-console */

async function start () {
  const server = await signalling.start({
    port: argv.port || argv.p || process.env.PORT || 9090,
    host: argv.host || argv.h || process.env.HOST || '0.0.0.0',
    key: argv.key || process.env.KEY,
    cert: argv.cert || process.env.CERT,
    pfx: argv.pfx || process.env.PFX,
    passphrase: argv.passphrase || process.env.PFX_PASSPHRASE,
    cryptoChallenge: !(argv.disableCryptoChallenge || process.env.DISABLE_CRYPTO_CHALLENGE),
    strictMultiaddr: !(argv.disableStrictMultiaddr || process.env.DISABLE_STRICT_MULTIADDR),
    metrics: !(argv.disableMetrics || process.env.DISABLE_METRICS)
  })

  console.log('Listening on:', server.info.uri)

  process.on('SIGINT', async () => {
    try {
      await server.stop()
    } catch (err) {
      console.error(err)
      process.exit(2)
    }

    console.log('Rendezvous server stopped')
    process.exit(0)
  })
}

start()
  .catch((err) => {
    console.error(err)
    process.exit(2)
  })
