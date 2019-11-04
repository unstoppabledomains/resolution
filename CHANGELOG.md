## 0.2.43
* Namicorn#addressOrThrow - new method that throws ResolutionError if currency address is not found
* Namicorn#namehash - new method for namehashing the domain name. Name hash of a domain is an ID that is used to store the information about the domain on the blockchain. If you would browse the blockchain, you would never see domain names, just name hashes.
* Now throwing a resolution error when ens or zns is down
* Ens multicoin support
* Moved UD to a Udapi naming service
* refactored namicorn#address to the point it won't call namicorn#resolve anymore
* extended namingService class to contain address method

## 0.2.42
* Added documentation to Namicorn, ENS and ZNS files
* Connected typedoc to the project
* Added user-agent to fetch calls for https://unstoppabledomains.com/
* Specified scripts for automating generation of docs

## 0.2.41

* Make Zns#getContractField #getContractMapValue and #getResolverRecordsStructure pseudo-private methods by adding _ in front of the names
* Added Zns#resolution method which returns everything what is stored on zilliqa for specific domain

## 0.2.39 - 0.2.40

* Zns network and url options support
* Ens and Zns support custom contracts registryAddress
* Adjust for breaking change at GetSmartContractSubState Zilliqa RPC call

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
