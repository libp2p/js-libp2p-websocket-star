# Deployment

## IPFS Infra

We have a [dokku](https://github.com/ipfs/ops-requests/issues/31) setup ready for this to be deployed, to deploy simple do (you have to have permission first):

```sh
# if you already have added the remote, you don't need to do it again
> git remote add dokku dokku@cloud.ipfs.team:ws-star
> git push dokku master
```

More info: https://github.com/libp2p/js-libp2p-webrtc-star/pull/48

## Other

# mkg20001
The nodes `ws-star-signal-{2,4,h}.servep2p.com` run on `host0.zion.host`

Upgrades are done by running `bash /home/maciej/upgrade-rendezvous.sh` which runs docker pull and re-creates the containers
