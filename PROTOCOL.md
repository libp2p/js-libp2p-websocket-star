# Protocol

### `/ws-star/2.0.0`

## Connecting & Crypto challenge

```protobuf
message IdentifyRequest {
  required string nonce = 1;
}

message IdentifyResponse {
  required string id = 1;
  required string pubKey = 2;
  required bytes signature = 3;
}
```

### Error Handling

If verifing the IdentifyResponse fails the connection gets closed by the server (protocol error)

### Example Connection

C: connects

S: Uses `.getPeerInfo()` to get id. Generates random nonce (64 byte alphanumeric string) and sends IndentifyRequest.

C: Signs nonce and send id, pubkey and signature back to server as IndentifyResponse

S: Verifies IndentifyResponse

S: Server adds peer to peerDB, starts to announce peer
(If peer disconnects server stops to announce it)

## Discovery

The server peer periodically sends a list of all ids (in binary instead of b58)

The client peer responds with discovery ACKs (which are basically pings)

```protobuf
message DiscoveryEvent {
  repeated bytes id = 1;
}

message DiscoveryACK {
  required bool ok = 1;
}
```

## Dials

Dials work using p2p-circuit (currently with a fixed relay server)

### Example Connection

Ca: Connects via `<server-address>/p2p-circuit/ipfs/<dst-id>`

Ca -> S -> Cb: Uses p2p-circuit to establish a connection with `<dst-id>`

Cb: Finishes up connection
