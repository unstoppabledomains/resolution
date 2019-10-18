## Unreleased

* Zns network and url options support
* Ens and Zns support custom contracts registryAddress

## 0.2.38

* Updated zilliqa library to 0.8.1

## 0.2.37

* Support node 12
* Transform owner old zil address format to a new zil format

## 0.2.36

* Add return type for Ens#resolve
* Add isSupportedDomainInNetwork in namicorn
* Add isSupportedNetwork for ZNS 


## 0.2.35

* Make Ens#network and Ens#url public properties
* Change default ENS source protocol from wss (websocket) to https
* Make Ens `web3`, `ensContract` and `registrarContract` private properties
* Ability to provide ENS network configuration as string like `mainnet`, `testnet` etc.
* Make properties of `Namicorn` class readonly

## 0.2.34 - 0.2.31

* Added isSupportedNetwork method for ens
* Make isSupportedNetwork configurable from outside by passing network agrument
* isSupportedDomain is no longer checks for supported network inside the ens

## 0.2.30 and earlier

* Changelog is not tracked
