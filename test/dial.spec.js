/* eslint-env mocha */

'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const multiaddr = require('multiaddr')
const each = require('async/each')
const pull = require('pull-stream')
const Buffer = require('safe-buffer').Buffer

const WebSocketsStar = require('../src')

describe('dial', () => {
  // TODO refactor how this clean works
  const clean = require('./clean')

  let ws1
  let ws2
  let ma1
  let ma1v6
  let ma2
  let ma2v6

  const maHSDNS = '/dns/ws-star-signal-1.servep2p.com'
  const maHSDNS6 = '/dns6/ws-star-signal-2.servep2p.com'
  const maHSIP = '/ip4/148.251.206.162/tcp/9090'
  const maHSIP6 = '/ip6/2a01:4f8:212:e0::1/tcp/4287'

  const maLS = '/ip4/127.0.0.1/tcp/15555'
  const maLS6 = '/ip6/::1/tcp/13333'
  const maGen = (base, id) => multiaddr(`/${base}/p2p-websocket-star/ws/ipfs/${id}`) // https
  // const maGen = (base, id) => multiaddr(`/libp2p-webrtc-star${base}/ws/ipfs/${id}`)

  if (process.env.REMOTE_DNS) {
    // test with deployed signalling server using DNS
    console.log('Using DNS:', maHSDNS)
    ma1 = maGen(maHSDNS, 'QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2a')
    ma1v6 = maGen(maHSDNS6, 'QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2a')
    ma2 = maGen(maHSDNS, 'QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2b')
    ma2v6 = maGen(maHSDNS6, 'QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2b')
  } else if (process.env.REMOTE_IP) {
    // test with deployed signalling server using IP
    console.log('Using IP:', maHSIP)
    ma1 = maGen(maHSIP, 'QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2a')
    ma1v6 = maGen(maHSIP6, 'QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2a')
    ma2 = maGen(maHSIP, 'QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2b')
    ma2v6 = maGen(maHSIP6, 'QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2b')
  } else {
    ma1 = maGen(maLS, 'QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2a')
    ma1v6 = maGen(maLS6, 'QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2a')
    ma2 = maGen(maLS, 'QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2b')
    ma2v6 = maGen(maLS6, 'QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2b')
  }

  before((done) => {
    ws1 = new WebSocketsStar()
    ws2 = new WebSocketsStar()

    each([
      [ws1, ma1],
      [ws1, ma1v6],
      [ws2, ma2],
      [ws2, ma2v6]
    ], (i, n) => i[0].createListener((conn) => pull(conn, conn)).listen(i[1], n), done)
  })

  it('dial on IPv4, check callback', (done) => {
    ws1.dial(ma2, (err, conn) => {
      expect(err).to.not.exist()

      const data = Buffer.from('some data')

      pull(
        pull.values([data]),
        conn,
        pull.collect((err, values) => {
          expect(err).to.not.exist()
          values[0] = Buffer.from(values[0])
          expect(values).to.eql([data])
          done()
        })
      )
    })
  })

  it('dial offline / non-exist()ent node on IPv4, check callback', (done) => {
    const maOffline = multiaddr('/ip4/127.0.0.1/tcp/15555/ws/p2p-websocket-star/ipfs/ABCD')

    ws1.dial(maOffline, (err) => {
      expect(err).to.exist()
      done()
    })
  })

  it('dial on IPv6, check callback', (done) => {
    ws1.dial(ma2v6, (err, conn) => {
      expect(err).to.not.exist()

      const data = Buffer.from('some data')

      pull(
        pull.values([data]),
        conn,
        pull.collect((err, values) => {
          expect(err).to.not.exist()
          values[0] = Buffer.from(values[0])
          expect(values).to.be.eql([data])
          done()
        })
      )
    })
  })

  after(() => clean.cleaner(ws1, ws2))
})
