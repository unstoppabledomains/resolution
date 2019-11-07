export default [
  {
      "constant": true,
      "inputs": [
          {
              "internalType": "bytes",
              "name": "key",
              "type": "bytes"
          },
          {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
          }
      ],
      "name": "get",
      "outputs": [
          {
              "internalType": "bytes",
              "name": "",
              "type": "bytes"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
      "constant": false,
      "inputs": [
          {
              "internalType": "bytes",
              "name": "key",
              "type": "bytes"
          },
          {
              "internalType": "bytes",
              "name": "value",
              "type": "bytes"
          },
          {
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
          }
      ],
      "name": "set",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "inputs": [
          {
              "internalType": "contract Registry",
              "name": "registry",
              "type": "address"
          }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "constructor"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "internalType": "address",
              "name": "owner",
              "type": "address"
          },
          {
              "indexed": true,
              "internalType": "bytes",
              "name": "key",
              "type": "bytes"
          },
          {
              "indexed": false,
              "internalType": "bytes",
              "name": "value",
              "type": "bytes"
          },
          {
              "indexed": true,
              "internalType": "uint256",
              "name": "tokenId",
              "type": "uint256"
          }
      ],
      "name": "Set",
      "type": "event"
  }
];