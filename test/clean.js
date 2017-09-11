'use strict'
/* eslint-env mocha */

let toclean = []

afterEach(() => {
  toclean.forEach(s => s.disconnect())
  toclean = []
})

function cleaner () {
  toclean.forEach(s => {
    if (s.disconnect) s.disconnect()
    else s.close()
  })
}

module.exports = () => {
  toclean.push.apply(toclean, arguments)
}

module.exports.cleaner = cleaner
