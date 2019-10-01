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

describe('peer discovery', () => {
  const listeners = []
  let ws1
  const ma1 = multiaddr('/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo4A')
  let ws2
  const ma2 = multiaddr('/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo4B')
  let ws3
  const ma3 = multiaddr('/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo4C')

  after(() => {
    return Promise.all(listeners.map((l) => l.close()))
  })

  after(() => Promise.all(listeners.map((l) => l.close())))

  it('listen on the first', () => {
    ws1 = new WebSocketStar({ upgrader: mockUpgrader, allowJoinWithDisabledChallenge: true })

    const listener = ws1.createListener((/* conn */) => {})

    listeners.push(listener)

    return listener.listen(ma1)
  })

  it('listen on the second, discover the first', (done) => {
    ws2 = new WebSocketStar({ upgrader: mockUpgrader, allowJoinWithDisabledChallenge: true })

    ws1.discovery.once('peer', (peerInfo) => {
      expect(peerInfo.multiaddrs.has(ma2)).to.equal(true)
      done()
    })

    const listener = ws2.createListener((/* conn */) => {})

    listeners.push(listener)
    listener.listen(ma2)
  })

  it('new peer receives peer events for all other peers on connect', (done) => {
    ws3 = new WebSocketStar({ upgrader: mockUpgrader, allowJoinWithDisabledChallenge: true })

    const discovered = []
    ws3.discovery.on('peer', (peerInfo) => {
      discovered.push(peerInfo.multiaddrs)
      if (discovered.length === 2) {
        gotAllPeerEvents()
      }
    })

    const gotAllPeerEvents = () => {
      const allMas = new Set()
      discovered.forEach(mas => {
        mas.forEach(ma => allMas.add(ma.toString()))
      })
      expect(allMas.has(ma1.toString())).to.equal(true)
      expect(allMas.has(ma2.toString())).to.equal(true)
      done()
    }

    const listener = ws3.createListener((/* conn */) => {})

    listeners.push(listener)
    listener.listen(ma3)
  })
})
