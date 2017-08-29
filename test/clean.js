let toclean = []
function cleaner() {
  toclean.forEach(s => {
    if (s.disconnect) s.disconnect()
    else s.close()
  })
}

afterEach(() => {
  toclean.forEach(s => s.disconnect())
  toclean = []
})
module.exports = function () {
  toclean.push.apply(toclean, arguments)
}
module.exports.cleaner = cleaner
