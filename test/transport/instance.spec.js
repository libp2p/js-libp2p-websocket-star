/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const WSStar = require('../../src')

describe('instantiate the transport', () => {
  it('create', () => {
    const wstar = new WSStar()
    expect(wstar).to.exist()
  })

  it('create without new', () => {
    expect(() => WSStar()).to.throw()
  })
})
