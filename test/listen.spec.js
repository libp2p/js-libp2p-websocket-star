/* eslint-env mocha */

'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const multiaddr = require('multiaddr')

const WebSocketStar = require('../src')

const mockUpgrader = {
  upgradeInbound: maConn => maConn,
  upgradeOutbound: maConn => maConn
}

describe('listen', () => {
  let ws

  const ma = multiaddr('/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooA')
  const mav6 = multiaddr('/ip6/::1/tcp/15003/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooB')

  before(() => {
    ws = new WebSocketStar({ upgrader: mockUpgrader, allowJoinWithDisabledChallenge: true })
  })

  it('listen, check for promise', async () => {
    const listener = ws.createListener((conn) => {})

    await listener.listen(ma)
    await listener.close()
  })

  it('listen, check for listening event', (done) => {
    const listener = ws.createListener((conn) => {})

    listener.once('listening', async () => {
      await listener.close()
      done()
    })

    listener.listen(ma)
  })

  it('listen, check for the close event', (done) => {
    const listener = ws.createListener((conn) => {})

    listener.once('listening', () => {
      listener.once('close', done)
      listener.close()
    })

    listener.listen(ma)
  })

  // travis ci has some ipv6 issues. circle ci is fine.
  // Also, aegir is failing to propagate the environment variables
  // into the browser: https://github.com/ipfs/aegir/issues/177
  // ..., which was causing this test to fail.
  // Activate this test after the issue is solved.
  // skiptravis('listen on IPv6 addr', (done) => {
  it.skip('listen on IPv6 addr', (done) => {
    const listener = ws.createListener((conn) => {})

    listener.listen(mav6, (err) => {
      expect(err).to.not.exist()
      listener.close(done)
    })
  })

  it('getAddrs', async () => {
    const listener = ws.createListener((conn) => {})

    await listener.listen(ma)

    const addrs = listener.getAddrs()
    expect(addrs[0]).to.deep.equal(ma)

    await listener.close()
  })
})
