"use strict"

//socket.io-pull-stream
const Queue = require("data-queue")
const uuid = require("uuid")
const pull = require("pull-stream")
const sioname = (type, name) => "socket.io-pull-stream." + type + (name ? "." + name : "")
const debug = require("debug")
const log = debug("socket-pull")

function SIOSource(sio, id) {
  const q = Queue()
  log(id, "create source")
  sio.emit(sioname("accept", id))
  sio.on(sioname("error", id), err => {
    log(id, "queue error")
    q.error(err)
  })
  sio.on(sioname("queue", id), data => {
    log(id, "queue data")
    q.append(data)
  })
  sio.on("disconnect", () => q.error(true))
  return function (end, cb) {
    if (end) return cb(end)
    q.get(cb)
  }
}

function SIOSink(sio, id) {
  const q = Queue()
  log(id, "create sink")
  sio.once(sioname("accept", id), () => {
    log(id, "start transmission")
    function loop() {
      q.get((err, data) => {
        log(id, "send", err ? "error" : "data")
        if (err) return sio.emit(sioname("error", id))
        sio.emit(sioname("queue", id), data)
        loop()
      })
    }
    loop()
  })
  return function (read) {
    read(null, function (end, data) {
      if (end) return q.error(end)
      else q.append(data)
    })
  }
}

module.exports = function SIOPullStream(sio) {
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
    pull(
      sio.createSource(id),
      tsio.createSink(id)
    )
  }
}
