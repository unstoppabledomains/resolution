import sha3 from '../utils/sha3';

export const namehash = (name = '', 
  { parent, prefix }
  : {parent?: string, prefix?: boolean} = {prefix: true}) => {
  parent = parent || '0000000000000000000000000000000000000000000000000000000000000000'
  const address = [parent]
    .concat(
      name
      .split('.')
      .reverse()
      .filter(label => label)
    )
    .reduce((parent, label) =>
      childhash(parent, label, {prefix: false}),
    )
  return prefix ? '0x' + address : address;
};

export const childhash = (parent: string, child: string, options: {prefix: boolean} = {prefix: true}) => {
  parent = parent.replace(/^0x/, "");
  return sha3(parent + sha3(child, {hexPrefix: false}), {hexPrefix: options.prefix, inputEnc: 'hex'});
};

export default namehash;
