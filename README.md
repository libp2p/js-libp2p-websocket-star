# ⛔️ DEPRECATED

libp2p-websocket-star is not supported anymore from [libp2p@0.27.0](https://github.com/libp2p/js-libp2p/releases/tag/v0.27.0).  
Check [js-libp2p/doc/CONFIGURATION.md](https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md) for what modules are currently supported.

_This library will not be maintained._

---

# libp2p-websocket-star

[![](https://img.shields.io/badge/made%20by-mkg20001-blue.svg?style=flat-square)](http://protocol.ai)
[![](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![](https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23libp2p)
[![Discourse posts](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg)](https://discuss.libp2p.io)
[![](https://img.shields.io/codecov/c/github/libp2p/js-libp2p-websocket-star.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-websocket-star)
[![](https://img.shields.io/travis/libp2p/js-libp2p-websocket-star.svg?style=flat-square)](https://travis-ci.com/libp2p/js-libp2p-websocket-star)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-websocket-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websocket-star)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)
[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)
[![](https://github.com/libp2p/interface-peer-discovery/raw/master/img/badge.png)](https://github.com/libp2p/interface-peer-discovery)

> libp2p-webrtc-star without webrtc. Just  WebSockets with a relay point in the middle.

## Lead Maintainer

[Jacob Heun](https://github.com/jacobheun)

## Description

`libp2p-websocket-star` is one of the multiple transports available for libp2p. `libp2p-websocket-star` incorporates both a transport and a discovery service that is facilitated by the rendezvous server, also available in this repo and module.

## Usage

### Example

```
TODO
```

### Install

```bash
> npm install libp2p-websocket-star
```

### API

### Transport

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)

### Connection

[![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)](https://github.com/libp2p/interface-connection)

### Peer Discovery - `ws.discovery`

[![](https://github.com/libp2p/interface-peer-discovery/raw/master/img/badge.png)](https://github.com/libp2p/interface-peer-discovery)

### Example

```js
const libp2p = require("libp2p")
const Id = require("peer-id")
const Info = require("peer-info")
const multiaddr = require("multiaddr")
const pull = require('pull-stream')

const WSStar = require('libp2p-websocket-star')

Id.create((err, id) => {
  if (err) throw err

  const peerInfo = new Info(id)
  peerInfo.multiaddrs.add(multiaddr("/dns4/ws-star-signal-1.servep2p.com/tcp/443/wss/p2p-websocket-star/"))

  // TODO -> review why the ID can not be passed by the .listen call
  const ws = new WSStar({ id: id }) // the id is required for the crypto challenge

  const modules = {
    transport: [
      ws
    ],
    discovery: [
      ws.discovery
    ]
  }

  const node = new libp2p(modules, peerInfo)

  node.handle("/test/1.0.0", (protocol, conn) => {
    pull(
      pull.values(['hello']),
      conn,
      pull.map((s) => s.toString()),
      pull.log()
    )
  })

  node.start((err) => {
    if (err) {
      throw err
    }

    node.dial(peerInfo, "/test/1.0.0", (err, conn) => {
      if (err) {
        throw err
      }

      pull(
        pull.values(['hello from the other side']),
        conn,
        pull.map((s) => s.toString()),
        pull.log()
      )
    })
  })
})
```

Outputs:
```
hello
hello from the other side
```

## [Rendezvous server](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous#usage)

## Usage

To reduce dependencies `libp2p-websocket-star` comes without the rendezvous server, that means that you need to install `libp2p-websocket-star-rendezvous` to start a rendezvous server. To do that, first install the module globally in your machine with:

```bash
> npm install --global libp2p-websocket-star-rendezvous
```

This will install a `rendezvous` CLI tool. Now you can spawn the server with:

```bash
> rendezvous --port=9090 --host=127.0.0.1
```

Defaults:

- `port` - 13579
- `host` - '0.0.0.0'

## Hosted Rendezvous server

We host a rendezvous server at `/dns4/ws-star.discovery.libp2p.io` that can be used for practical demos and experimentation, it **should not be used for apps in production**.

A libp2p-websocket-star address, using the signalling server we provide, looks like:

`/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star/ipfs/<your-peer-id>`

Note: The address above indicates WebSockets Secure, which can be accessed from both http and https.

LICENSE MIT
