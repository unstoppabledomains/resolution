import Resolution from '.';


const ignore = async <T>(promise: Promise<T>): Promise<T | null> => {
  try {
    return await promise;
  } catch {
    return null;
  }
}

(async () => {
  const resolution = new Resolution();
  const domain = process.argv[process.argv.length - 1];
  const data = {
    resolver: await ignore(resolution.resolver(domain)),
    owner: await ignore(resolution.owner(domain)),
    ipfsHash: await ignore(resolution.ipfsHash(domain)),
    email: await ignore(resolution.email(domain)),
    btc: await resolution.address(domain, "BTC"),
    etc: await resolution.address(domain, "ETC"),
  }
  console.log(JSON.stringify(data, null, 2));
})();
