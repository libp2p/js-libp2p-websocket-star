'use strict'

const gulp = require('gulp')
const sigServer = require('./sig-server/src')

let sigS, sigS2, sigS3

gulp.task('test:node:before', boot)
gulp.task('test:node:after', stop)
gulp.task('test:browser:before', boot)
gulp.task('test:browser:after', stop)
gulp.task("wait", (cb) => {})

function boot(done) {
  const options = {
    port: 15555,
    host: '0.0.0.0',
    cryptoChallenge: false,
    strictMultiaddr: false
  }

  sigServer.start(options, (err, server) => {
    if (err) {
      throw err
    }
    sigS = server
    console.log('signalling on:', server.info.uri)
    const options = {
      port: 14444,
      host: '0.0.0.0'
    }

    sigServer.start(options, (err, server) => {
      if (err) {
        throw err
      }
      sigS2 = server
      console.log('strict signalling on:', server.info.uri)
      const options = {
        port: 13333,
        host: '::',
        cryptoChallenge: false,
        strictMultiaddr: false
      }

      sigServer.start(options, (err, server) => {
        if (err) {
          throw err
        }
        sigS3 = server
        console.log('ipv6 signalling on:', server.info.uri)
        done()
      })
    })
  })
}

function stop(done) {
  require("async/each")([sigS, sigS2, sigS3], (s, n) => s.stop(n), done)
}

require('aegir/gulp')(gulp)
