/**
 * WebsocketStar Transport
 * @class
 * @param {Object} options - Options for the listener
 * @param {PeerId} options.id - Id for the crypto challenge
 */
declare class WebsocketStar {
    constructor(options: {
        id: PeerId;
    });
    /**
     * Sets the id after transport creation (aka the lazy way)
     * @param {PeerId} id
     * @returns {undefined}
     */
    lazySetId(id: PeerId): undefined;
    /**
     * Dials a peer
     * @param {Multiaddr} ma - Multiaddr to dial to
     * @param {Object} options
     * @param {function} callback
     * @returns {Connection}
     */
    dial(ma: Multiaddr, options: any, callback: (...params: any[]) => any): Connection;
    /**
     * Creates a listener
     * @param {Object} options
     * @param {function} handler
     * @returns {Listener}
     */
    createListener(options: any, handler: (...params: any[]) => any): Listener;
    /**
     * Filters multiaddrs
     * @param {Multiaddr[]} multiaddrs
     * @returns {boolean}
     */
    filter(multiaddrs: Multiaddr[]): boolean;
}

declare class Listener {
    constructor(options: {
        id: PeerId;
        handler: (...params: any[]) => any;
    });
    /**
     * Listens on a multiaddr
     * @param {Multiaddr} ma
     * @param {function} callback
     * @returns {undefined}
     */
    listen(ma: Multiaddr, callback: (...params: any[]) => any): undefined;
    /**
     * Gets the addresses the listener listens on
     * @param {function} callback
     * @returns {undefined}
     */
    getAddrs(callback: (...params: any[]) => any): undefined;
    /**
     * Dials a peer
     * @param {Multiaddr} ma - Multiaddr to dial to
     * @param {Object} options
     * @param {function} callback
     * @returns {undefined}
     */
    dial(ma: Multiaddr, options: any, callback: (...params: any[]) => any): undefined;
}

