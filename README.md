# libp2p-websocket-star

[![](https://img.shields.io/badge/made%20by-mkg20001-blue.svg?style=flat-square)](http://ipn.io)
[![Travis](https://travis-ci.org/libp2p/js-libp2p-websocket-star.svg?style=flat-square)](https://travis-ci.org/libp2p/js-libp2p-websocket-star)
[![Circle](https://circleci.com/gh/libp2p/js-libp2p-websocket-star.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-websocket-star)
[![Coverage](https://coveralls.io/repos/github/libp2p/js-libp2p-websocket-star/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-websocket-star?branch=master)
[![david-dm](https://david-dm.org/libp2p/js-libp2p-websocket-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websocket-star)

![](https://raw.githubusercontent.com/libp2p/interface-connection/master/img/badge.png)
![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)

> libp2p-webrtc-star without webrtc. Just plain socket.io.

## Description

`libp2p-websocket-star` is one of the multiple transports available for libp2p. `libp2p-websocket-star` incorporates both a transport and a discovery service that is facilitated by the rendezvous server, also available in this repo and module.

## Usage

### Installation

```bash
> npm install libp2p-websocket-star
```

### API

[![](https://raw.githubusercontent.com/libp2p/interface-transport/master/img/badge.png)](https://github.com/libp2p/interface-transport)

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

# [Rendezvous server](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous#usage)

## Usage

To reduce dependencies `libp2p-websocket-star` comes without the rendezvous server, that means that you need to install `libp2p-websocket-star-rendezvous` to start a rendezvous server. To do that, first insall the module globally in your machine with:

```bash
> npm install --global libp2p-websocket-star-rendezvous
```

This will install a `websockets-star` CLI tool. Now you can spawn the server with:

```bash
> websockets-star --port=9090 --host=127.0.0.1
```

Defaults:

- `port` - 13579
- `host` - '0.0.0.0'

## Hosted Rendezvous server

We host a rendezvous server at `ws-star-signal-1.servep2p.com` and `ws-star-signal-2.servep2p.com` that can be used for practical demos and experimentation, it **should not be used for apps in production**.

Additionally there is a rendezvous server at `ws-star-signal-3.servep2p.com` running the latest master version.

A libp2p-websocket-star address, using the signalling server we provide, looks like:

`/dns4/ws-star-signal-1.servep2p.com/tcp/443/wss/p2p-websocket-star/ipfs/<your-peer-id>`

Note: The address above indicates WebSockets Secure, which can be accessed from both http and https.

### This module uses `pull-streams`

We expose a streaming interface based on `pull-streams`, rather then on the Node.js core streams implementation (aka Node.js streams). `pull-streams` offers us a better mechanism for error handling and flow control guarantees. If you would like to know more about why we did this, see the discussion at this [issue](https://github.com/ipfs/js-ipfs/issues/362).

You can learn more about pull-streams at:

- [The history of Node.js streams, nodebp April 2014](https://www.youtube.com/watch?v=g5ewQEuXjsQ)
- [The history of streams, 2016](http://dominictarr.com/post/145135293917/history-of-streams)
- [pull-streams, the simple streaming primitive](http://dominictarr.com/post/149248845122/pull-streams-pull-streams-are-a-very-simple)
- [pull-streams documentation](https://pull-stream.github.io/)

#### Converting `pull-streams` to Node.js Streams

If you are a Node.js streams user, you can convert a pull-stream to a Node.js stream using the module [`pull-stream-to-stream`](https://github.com/pull-stream/pull-stream-to-stream), giving you an instance of a Node.js stream that is linked to the pull-stream. For example:

```js
const pullToStream = require('pull-stream-to-stream')

const nodeStreamInstance = pullToStream(pullStreamInstance)
// nodeStreamInstance is an instance of a Node.js Stream
```

To learn more about this utility, visit https://pull-stream.github.io/#pull-stream-to-stream.

LICENSE MIT
