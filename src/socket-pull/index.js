"use strict"

//socket.io-pull-stream
const Queue = require("data-queue")
const uuid = require("uuid")
const pull = require("pull-stream")
const sioname = (type, name) => "socket.io-pull-stream." + type + (name ? "." + name : "")

function SIOSource(sio, id) {
  const q = Queue()
  sio.emit(sioname("accept", id))
  sio.on(sioname("queue", id), q.error)
  sio.on(sioname("error", id), q.append)
  sio.on("disconnect", () => q.error(true))
  return function (end, cb) {
    if (end) return cb(end)
    q.get(cb)
  }
}

function SIOSink(sio, id) {
  const q = Queue()
  sio.once(sioname("accept", id), () => {
    function loop() {
      q.get((err, data) => {
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
      tsio.createSink(tsio)
    )
  }
}
