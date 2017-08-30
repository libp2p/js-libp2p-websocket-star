'use strict'

const multiaddr = require('multiaddr')
const crypto = require("crypto")
const sha5 = text => crypto.createHash('sha512').update(text).digest('hex')
const bs58 = require('bs58')
const b58encode = text => bs58.encode(Buffer.from(text))

function cleanUrlSIO(ma) {
  const maStrSplit = ma.toString().split('/')

  if (!multiaddr.isName(ma)) {
    return 'http://' + maStrSplit[3] + ':' + maStrSplit[5]
  } else {
    const wsProto = ma.protos()[2].name
    if (wsProto === 'ws') {
      return 'http://' + maStrSplit[3]
    } else if (wsProto === 'wss') {
      return 'https://' + maStrSplit[3]
    } else {
      throw new Error('invalid multiaddr' + ma.toString())
    }
  }
}

//note to that code below: that is making it more secure. and actually more easy.

const types = {
  string: v => typeof v == "string",
  object: v => typeof v == "object",
  multiaddr: v => {
    if (!types.string(v)) return
    try {
      multiaddr(v)
      return true
    } catch (e) {
      return false
    }
  },
  function: v => typeof v == "function"
}

function validate(def, data) {
  if (!Array.isArray(data)) throw new Error("Data is not an array")
  def.forEach((type, index) => {
    if (!types[type]) {
      console.error("Type %s does not exist", type)
      throw new Error("Type " + type + " does not exist")
    }
    if (!types[type](data[index])) throw new Error("Data at index " + index + " is invalid for type " + type)
  })
}

function Protocol(log) {
  if (!log) log = () => {}
  const self = this
  self.requests = {}
  self.addRequest = (name, def, handle) => {
    self.requests[name] = {
      def,
      handle
    }
  }
  self.handleSocket = (socket) => {
    socket.r = {}
    for (var request in self.requests) {
      const r = self.requests[request]
      socket.on(request, function () {
        const data = [...arguments]
        try {
          validate(r.def, data)
          if (socket.id) data.unshift(socket) //only do that on servers
          r.handle.apply(null, data)
        } catch (e) {
          log(e)
          log("peer %s has sent invalid data for request %s", socket.id || "<server>", request, data)
          return
        }
      })
    }
  }
}

exports = module.exports
exports.cleanUrlSIO = cleanUrlSIO
exports.validate = validate
exports.Protocol = Protocol
exports.sha5 = sha5
exports.b58encode = b58encode
