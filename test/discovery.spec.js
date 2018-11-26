/* eslint-env mocha */

'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const multiaddr = require('multiaddr')
const each = require('async/each')
const series = require('async/series')
const parallel = require('async/parallel')
const rendezvous = require('libp2p-websocket-star-rendezvous')

const WebSocketStar = require('../src')

describe('peer discovery', () => {
  let listeners = []
  let ws1
  const ma1 = multiaddr('/ip4/127.0.0.1/tcp/16001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo4A')
  let ws2
  const ma2 = multiaddr('/ip4/127.0.0.1/tcp/16002/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo4B')
  let ws3
  const ma3 = multiaddr('/ip4/127.0.0.1/tcp/16002/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo4C')

  const _r = []
  before((done) => {
    const base = (v) => Object.assign({
      host: '0.0.0.0',
      cryptoChallenge: false,
      strictMultiaddr: false,
      refreshPeerListIntervalMS: 1000
    }, v)

    parallel([['discovery r1', {port: 16001}], ['discovery r2', {port: 16002}]].map((v) => (cb) => {
      rendezvous.start(base(v.pop()), (err, r) => {
        if (err) { return cb(err) }
        _r.push(r)
        console.log('%s: %s', v.pop(), r.info.uri)
        cb()
      })
    }), done)
  })

  after((done) => {
    series([
      cb => each(listeners, (l, next) => l.close(next), cb),
      cb => each(_r, (r, next) => r.stop(next), cb)
    ], done)
  })

  it('listen on the first', (done) => {
    ws1 = new WebSocketStar({ allowJoinWithDisabledChallenge: true })

    const listener = ws1.createListener((/* conn */) => {})

    listeners.push(listener)
    listener.listen(ma1, (err) => {
      expect(err).to.not.exist()
      done()
    })
  })

  it('listen on the second, discover the first', (done) => {
    ws2 = new WebSocketStar({ allowJoinWithDisabledChallenge: true })

    ws1.discovery.once('peer', (peerInfo) => {
      expect(peerInfo.multiaddrs.has(ma2)).to.equal(true)
      done()
    })

    const listener = ws2.createListener((/* conn */) => {})

    listeners.push(listener)
    listener.listen(ma2, (err) => {
      expect(err).to.not.exist()
    })
  })

  it('new peer receives peer events for all other peers on connect', (done) => {
    ws3 = new WebSocketStar({ allowJoinWithDisabledChallenge: true })

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
    listener.listen(ma3, (err) => {
      expect(err).to.not.exist()
    })
  })
})
