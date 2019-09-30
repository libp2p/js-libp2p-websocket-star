/* eslint-env mocha */

'use strict'

const multiaddr = require('multiaddr')
const series = require('async/series')
const each = require('async/each')
const pull = require('pull-stream')

const WebSocketStar = require('../src')

const mockUpgrader = {
  upgradeInbound: maConn => maConn,
  upgradeOutbound: maConn => maConn
}

describe('disconnect', () => {
  let ws1
  const ma1 = multiaddr('/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo5a')

  let ws2
  const ma2 = multiaddr('/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo5b')

  let conn
  let otherConn
  const listeners = []

  before((done) => {
    series([first, second], dial)

    function first (next) {
      ws1 = new WebSocketStar({ upgrader: mockUpgrader, allowJoinWithDisabledChallenge: true })

      const listener = ws1.createListener((conn) => pull(conn, conn))
      listener.listen(ma1, next)
      listeners.push(listener)
    }

    function second (next) {
      ws2 = new WebSocketStar({ upgrader: mockUpgrader, allowJoinWithDisabledChallenge: true })

      const listener = ws2.createListener((conn) => (otherConn = conn))
      listener.listen(ma2, next)
      listeners.push(listener)
    }

    function dial () {
      conn = ws1.dial(ma2, done)
    }
  })

  after(done => each(listeners, (l, next) => l.close(next), done))

  it('all conns die when one peer quits', (done) => {
    let endFn
    pull(
      (end, cb) => {
        endFn = cb
      },
      conn,
      pull.collect(err => {
        if (err) return done(err)
        pull(
          otherConn,
          pull.collect(err => {
            if (err) return done(err)
            endFn(true)
            done()
          })
        )
      })
    )
    const url = Object.keys(ws2.listenersRefs).shift()
    ws2.listenersRefs[url]._down()
  })
})
