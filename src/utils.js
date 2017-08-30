'use strict'

const multiaddr = require('multiaddr')
const Id = require("peer-id")
const crypto = require("libp2p-crypto")
const mafmt = require("mafmt")

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
          data.unshift(socket)
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

function getIdAndValidate(pub, id, cb) {
  Id.createFromPubKey(Buffer.from(pub, "hex"), (err, _id) => {
    if (err) return cb("Crypto error")
    if (_id.toB58String() != id) return cb("Id is not matching")
    return cb(null, crypto.keys.unmarshalPublicKey(Buffer.from(pub, "hex")))
  })
}

exports = module.exports
exports.cleanUrlSIO = cleanUrlSIO
exports.validate = validate
exports.Protocol = Protocol
exports.getIdAndValidate = getIdAndValidate
exports.validateMa = (ma) =>
  mafmt.WebRTCStar.matches(multiaddr(ma))
