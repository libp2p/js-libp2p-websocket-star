<a name="0.4.0"></a>
# [0.4.0](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/compare/v0.3.0...v0.4.0) (2019-07-19)


### Features

* switches to async/await and upgrade hapi to v18 ([946e8a1](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/946e8a1))


### BREAKING CHANGES

* All functions that took callbacks now return promises



<a name="0.3.0"></a>
# [0.3.0](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/compare/v0.2.4...v0.3.0) (2018-11-29)


### Bug Fixes

* dont use 'this' in root anon function ([c6a833e](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/c6a833e))
* logo was broken on main page ([#25](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/issues/25)) ([41eed04](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/41eed04))
* regex bug for ipv4 test ([#24](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/issues/24)) ([696ed92](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/696ed92))
* remove warning for too many listeners on socket.io sockets ([#28](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/issues/28)) ([3d9b96e](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/3d9b96e))


### Features

* include existing peers in response to ss-join ([f12aea3](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/f12aea3))
* use node 10 in docker image ([#26](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/issues/26)) ([91db9cf](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/91db9cf))



<a name="0.2.4"></a>
## [0.2.4](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/compare/v0.2.3...v0.2.4) (2018-10-16)


### Bug Fixes

* give crypto.verify a buffer ([#23](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/issues/23)) ([0c8c290](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/0c8c290))
* make it executable available through websocket-star ([d18087c](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/d18087c))



<a name="0.2.3"></a>
## [0.2.3](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/compare/v0.2.2...v0.2.3) (2018-02-12)



<a name="0.2.2"></a>
## [0.2.2](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/compare/v0.2.1...v0.2.2) (2017-12-07)


### Features

* Add libp2p logo to about page ([66be194](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/66be194))
* cryptoChallenge can be enabled by default after all! https://github.com/ipfs/js-ipfs/pull/1090/files\#r153143252 ([143a0a4](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/143a0a4))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/compare/v0.2.0...v0.2.1) (2017-11-19)


### Bug Fixes

* Docker cmd - feat: Disable metrics option ([21f95d2](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/21f95d2))
* release command ([37e5b1f](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/37e5b1f))



<a name="0.2.0"></a>
# [0.2.0](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/compare/v0.1.2...v0.2.0) (2017-10-28)


### Bug Fixes

* {webrtc => websocket} ([df53c25](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/df53c25))
* discovery fix - fix: debug log name ([1f163b8](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/1f163b8))
* lint ([585525e](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/585525e))
* package.json ([f5e91fe](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/f5e91fe))
* small name fix ([de84807](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/de84807))


### Features

* Joins metric - fix: config ([81c8eb7](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/81c8eb7))
* Link directly to readme in about page ([d7fba03](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/d7fba03))
* metrics (WIP) - feat: Dockerfile - fix/feat: various other things ([fa518b1](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/fa518b1))
* Update README - feat: Use dumb-init in docker-image ([4fbed33](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/4fbed33))



<a name="0.1.2"></a>
## [0.1.2](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/compare/v0.1.1...v0.1.2) (2017-09-08)


### Bug Fixes

* point to right location of bin ([3049ca8](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/3049ca8))



<a name="0.1.1"></a>
## [0.1.1](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/compare/v0.1.0...v0.1.1) (2017-09-08)


### Bug Fixes

* add main to package.json ([7ff704c](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous/commit/7ff704c))



<a name="0.1.0"></a>
# 0.1.0 (2017-09-08)



