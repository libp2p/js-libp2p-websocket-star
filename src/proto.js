'use strict'

const protons = require('protons')

module.exports = protons(`

  message IdentifyRequest {
    required string nonce = 1;
  }

  message IdentifyResponse {
    required string id = 1;
    required string pubKey = 2;
    required bytes signature = 3;
  }

  message DiscoveryEvent {
    repeated bytes id = 1;
  }

  message DiscoveryACK {
    required bool ok = 1;
  }

`)
