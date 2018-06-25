# libp2p-websocket-star-rendezvous

[![](https://img.shields.io/badge/made%20by-mkg20001-blue.svg?style=flat-square)](http://ipn.io)
[![Travis](https://travis-ci.org/libp2p/js-libp2p-websocket-star-rendezvous.svg?style=flat-square)](https://travis-ci.org/libp2p/js-libp2p-websocket-star-rendezvous)
[![Circle](https://circleci.com/gh/libp2p/js-libp2p-websocket-star-rendezvous.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-websocket-star-rendezvous)
[![Coverage](https://coveralls.io/repos/github/libp2p/js-libp2p-websocket-star-rendezvous/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-websocket-star-rendezvous?branch=master)
[![david-dm](https://david-dm.org/libp2p/js-libp2p-websocket-star-rendezvous.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websocket-star-rendezvous)

> The rendezvous service for [libp2p-websocket-star](https://github.com/libp2p/js-libp2p-websocket-star).

## Lead Maintainer

[Jacob Heun](https://github.com/jacobheun)

## Descriptions

Nodes using `libp2p-websocket-star` will connect to a known point in the network, a rendezvous point where they can learn about other nodes (Discovery) and route their messages to other nodes (2 hop message routing, also known as relay).

## Usage

`libp2p-websocket-star-rendezvous` is the rendezvous server required for `libp2p-websocket-star` and can be used to start a rendezvous server for development. To do that, first install the module globally in your machine with:

```bash
> npm install --global libp2p-websocket-star-rendezvous
```

This will install a `rendezvous` CLI tool. Now you can spawn the server with:

```bash
> rendezvous --port=9090 --host=127.0.0.1
```

Defaults:

- `port` - 9090
- `host` - '0.0.0.0'

## Docker

A docker image is offered for running this service in production

```
docker pull libp2p/websocket-star-rendezvous:release
docker run -d -p 9090:9090 --name rendezvous libp2p/websocket-star-rendezvous:release
```

To disable prometheus metrics run the server with `-e DISABLE_METRICS=1`

```
docker run -d -p 9090:9090 --name rendezvous -e DISABLE_METRICS=1 libp2p/websocket-star-rendezvous:release
```

## Hosted Rendezvous server

We host a rendezvous server at `ws-star-signal-1.servep2p.com` and `ws-star-signal-2.servep2p.com` that can be used for practical demos and experimentation, it **should not be used for apps in production**.

Additionally there is a rendezvous server at `ws-star-signal-3.servep2p.com` running the latest master version.

A libp2p-websocket-star address, using the signalling server we provide, looks like:

`/dns4/ws-star-signal-1.servep2p.com/wss/p2p-websocket-star/ipfs/<your-peer-id>`

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
