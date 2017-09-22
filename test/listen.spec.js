/* eslint-env mocha */

'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const multiaddr = require('multiaddr')

const WebSocketStar = require('../src')

describe('listen', () => {
  let ws

  const ma = multiaddr('/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooA')
  const mav6 = multiaddr('/ip6/::1/tcp/15003/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooB')

  before(() => {
    ws = new WebSocketStar()
  })

  it('listen, check for callback', (done) => {
    const listener = ws.createListener((conn) => {})

    listener.listen(ma, (err) => {
      expect(err).to.not.exist()
      listener.close(done)
    })
  })

  it('listen, check for listening event', (done) => {
    const listener = ws.createListener((conn) => {})

    listener.once('listening', () => listener.close(done))
    listener.listen(ma)
  })

  it('listen, check for the close event', (done) => {
    const listener = ws.createListener((conn) => {})

    listener.listen(ma, (err) => {
      expect(err).to.not.exist()
      listener.once('close', done)
      listener.close()
    })
  })

  it.skip('close listener with connections, through timeout', (done) => {
    // TODO ? Should this apply ?
  })

  it('listen on IPv6 addr', (done) => {
    const listener = ws.createListener((conn) => {})

    listener.listen(mav6, (err) => {
      expect(err).to.not.exist()
      listener.close(done)
    })
  })

  it('getAddrs', (done) => {
    const listener = ws.createListener((conn) => {})
    listener.listen(ma, (err) => {
      expect(err).to.not.exist()
      listener.getAddrs((err, addrs) => {
        expect(err).to.not.exist()
        expect(addrs[0]).to.deep.equal(ma)
        listener.close(done)
      })
    })
  })
})
