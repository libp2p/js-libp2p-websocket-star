'use strict'

const Hapi = require('hapi')
const merge = require("merge-recursive").recursive

exports = module.exports

exports.start = (options, callback) => {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  const config = merge(require('./config'), options)
  const log = config.log

  const port = options.port || config.hapi.port
  const host = options.host || config.hapi.host

  const http = new Hapi.Server(config.hapi.options)

  http.connection({
    port,
    host
  })

  http.start((err) => {
    if (err) {
      return callback(err)
    }

    log('signaling server has started on: ' + http.info.uri)

    http.peers = require('./routes-ws')(config, http).peers

    callback(null, http)
  })

  return http
}
