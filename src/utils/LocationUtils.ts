import {ResolutionError, ResolutionErrorCode} from '../errors/resolutionError';
import {NamingService} from '../NamingService';
import {DomainLocation, Locations} from '../types/publicTypes';

async function location(
  domain: string,
  service: NamingService,
): Promise<DomainLocation | null> {
  try {
    const [registryAddress, resolverAddress, ownerAddress] = await Promise.all([
      service.registryAddress(domain),
      service.resolver(domain),
      service.owner(domain),
    ]);

    return {
      registryAddress,
      resolverAddress,
      networkId: service['network'],
      blockchain: service['blockchain'],
      ownerAddress,
      blockchainProviderUrl: service['url'],
    };
  } catch (error) {
    if (
      error instanceof ResolutionError &&
      (error as ResolutionError).code === ResolutionErrorCode.UnregisteredDomain
    ) {
      return null;
    }
    throw error;
  }
}

export async function GetLocations(
  domains: string[],
  service: NamingService,
): Promise<Locations> {
  const promises: Promise<DomainLocation | null>[] = [];
  for (const domain of domains) {
    promises.push(location(domain, service));
  }
  const results = await Promise.all(promises);
  const locations: Locations = domains.reduce((locations, domain, i) => {
    locations[domain] = results[i];
    return locations;
  }, {} as Locations);
  return locations;
}
