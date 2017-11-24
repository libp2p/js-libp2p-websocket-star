'use strict'

const Hapi = require('@hapi/hapi')
const path = require('path')
const epimetheus = require('epimetheus')
const merge = require('merge-recursive').recursive
const Inert = require('@hapi/inert')
const { readFileSync } = require('fs')

exports = module.exports

exports.start = async (options = {}) => {
  const config = merge(Object.assign({}, require('./config')), Object.assign({}, options))
  const log = config.log

  const port = options.port || config.hapi.port
  const host = options.host || config.hapi.host

  let tls
  if (options.key && options.cert) {
    tls = {
      key: readFileSync(options.key),
      cert: readFileSync(options.cert),
      passphrase: options.passphrase
    }
  } else if (options.pfx && options.passphrase) {
    tls = {
      pfx: readFileSync(options.pfx),
      passphrase: options.passphrase
    }
  }

  const http = new Hapi.Server(Object.assign({
    port,
    host,
    tls
  }, config.hapi.options))

  await http.register(Inert)
  await http.start()

  log('rendezvous server has started on: ' + http.info.uri)

  http.peers = require('./routes')(config, http).peers

  http.route({
    method: 'GET',
    path: '/',
    handler: (request, reply) => reply.file(path.join(__dirname, 'index.html'), {
      confine: false
    })
  })

  if (config.metrics) {
    epimetheus.instrument(http)
  }

  return http
}
