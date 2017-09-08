'use strict'

const gulp = require('gulp')
const parallel = require('async/parallel')
const rendezvous = require('./src/rendezvous')

let r1
let r2
let r3

gulp.task('test:node:before', boot)
gulp.task('test:node:after', stop)
gulp.task('test:browser:before', boot)
gulp.task('test:browser:after', stop)

function boot (done) {
  const base = {
    host: '0.0.0.0',
    cryptoChallenge: false,
    strictMultiaddr: false
  }

  parallel([
    (cb) => rendezvous.start(Object.assign({port: 15555}, base), (err, r) => {
      if (err) { return cb(err) }
      r1 = r
      console.log('r1:', r.info.uri)
      cb()
    }),
    (cb) => rendezvous.start(Object.assign({port: 15555}, base), (err, r) => {
      if (err) { return cb(err) }
      r2 = r
      console.log('r2:', r.info.uri)
      cb()
    }),
    (cb) => rendezvous.start(Object.assign({port: 15555, host: '::'}, base), (err, r) => {
      if (err) { return cb(err) }
      r3 = r
      console.log('r3:', r.info.uri)
      cb()
    })
  ], done)
}

function stop (done) {
  parallel([
    (cb) => r1.stop(cb),
    (cb) => r2.stop(cb),
    (cb) => r3.stop(cb)
  ], done)
}

require('aegir/gulp')(gulp)
