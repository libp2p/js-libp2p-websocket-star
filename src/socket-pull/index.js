"use strict"

//socket.io-pull-stream
const Queue = require("data-queue")
const uuid = require("uuid")
const pull = require("pull-stream")
const sioname = (type, name) => "socket.io-pull-stream." + type + (name ? "." + name : "")
const debug = require("debug")
const _log = debug("socket-pull")

function SIOSource(sio, id) {
  const q = Queue()
  const log = sio.sioplog.bind(sio.sioplog, "source(" + id + ")")
  log("create source")
  sio.emit(sioname("accept", id))
  sio.on(sioname("error", id), err => {
    log("queue error")
    q.error(err)
  })
  sio.on(sioname("queue", id), data => {
    log("queue data")
    q.append(data)
  })
  sio.on("disconnect", () => q.error(true))
  return function (end, cb) {
    log("reading")
    if (end) return cb(end)
    q.get(cb)
  }
}

function SIOSink(sio, id) {
  const q = Queue()
  const log = sio.sioplog.bind(sio.sioplog, "  sink(" + id + ")")
  log("create sink")
  sio.once(sioname("accept", id), () => {
    log("start transmission")

    function loop() {
      q.get((err, data) => {
        log("send", err ? "error" : "data")
        if (err) return sio.emit(sioname("error", id))
        if (data) sio.emit(sioname("queue", id), data)
        loop()
      })
    }
    loop()
  })
  return function (read) {
    read(null, function next(end, data) {
      if (end) return q.error(end)
      q.append(data)
      read(null, next)
    })
  }
}

module.exports = function SIOPullStream(sio) {
  let log = sio.sioplog = sio.id ? _log.bind(_log, "[" + sio.id + "]") : _log
  sio.createSink = id => {
    if (!id) id = uuid()
    const sink = SIOSink(sio, id)
    sink.id = id
    return sink
  }
  sio.createSource = id => {
    const source = SIOSource(sio, id)
    source.id = id
    return source
  }
  sio.createProxy = (id, tsio) => {
    if (!sio.id) return log("ignore proxy. not a sio server")
    pull(
      sio.createSource(id),
      tsio.createSink(id)
    )
  }
}
