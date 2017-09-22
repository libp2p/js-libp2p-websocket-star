'use strict'

const gulp = require('gulp')
const parallel = require('async/parallel')
const rendezvous = require('libp2p-websocket-star-rendezvous')

let _r = []

gulp.task('test:node:before', boot)
gulp.task('test:node:after', stop)
gulp.task('test:browser:before', boot)
gulp.task('test:browser:after', stop)

function boot (done) {
  const base = (v) => Object.assign({
    host: '0.0.0.0',
    cryptoChallenge: false,
    strictMultiaddr: false,
    refreshPeerListIntervalMS: 1000
  }, v)

  parallel([['r1', {port: 15001, metrics: true}], ['r2', {port: 15002}], ['r3', {port: 15003, host: '::'}]].map((v) => (cb) => {
    rendezvous.start(base(v.pop()), (err, r) => {
      if (err) { return cb(err) }
      _r.push(r)
      console.log('%s: %s', v.pop(), r.info.uri)
      cb()
    })
  }), done)
}

function stop (done) {
  parallel(_r.map((r) => (cb) => r.stop(cb)), done)
  _r = []
}

require('aegir/gulp')(gulp)
