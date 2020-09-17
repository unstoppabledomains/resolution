import sha256 from './sha256';
import elliptic from 'elliptic';
// eslint-disable-next-line new-cap
const secp256k1 = new elliptic.ec('secp256k1');

const bytesLength = (a: string) => (a.length - 2) / 2;
const bytesSlice = (i: number, j: number, bs: string) =>
  '0x' + bs.slice(i * 2 + 2, j * 2 + 2);
const bytesToNumber = (hex: string) => parseInt(hex.slice(2), 16);

const decodeSignature = (hex: string) => [
  bytesSlice(64, bytesLength(hex), hex),
  bytesSlice(0, 32, hex),
  bytesSlice(32, 64, hex),
];

const toChecksum = (address: string) => {
  const addressHash = sha256(address.slice(2));
  let checksumAddress = '0x';
  for (let i = 0; i < 40; i++) {
    checksumAddress +=
      parseInt(addressHash[i + 2], 16) > 7
        ? address[i + 2].toUpperCase()
        : address[i + 2];
  }
  return checksumAddress;
};

export const recover = (hash: string, signature: string) => {
  const vals = decodeSignature(signature);
  const vrs = {
    v: bytesToNumber(vals[0]),
    r: vals[1].slice(2),
    s: vals[2].slice(2),
  };
  const ecPublicKey = secp256k1.recoverPubKey(
    Buffer.from(hash.slice(2), 'hex'),
    vrs,
    vrs.v < 2 ? vrs.v : 1 - (vrs.v % 2),
  );
  const publicKey = '0x' + ecPublicKey.encode('hex', false).slice(2);
  const publicHash = sha256(publicKey);
  const address = toChecksum('0x' + publicHash.slice(-40));
  return address;
};
