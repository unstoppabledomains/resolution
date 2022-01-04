import ResolutionError, {ResolutionErrorCode} from '../errors/resolutionError';

/**
 * Checks domain name for special symbols and returns address in lowercase without spaces
 * @throws Will throw an error if domain address contains special symbols
 * @param domain - a domain address
 */
const reg = RegExp('^[.a-z0-9-]+$');
export function prepareAndValidateDomain(domain: string): string {
  const retVal: string = domain ? domain.trim().toLowerCase() : '';
  if (!reg.test(retVal)) {
    throw new ResolutionError(ResolutionErrorCode.InvalidDomainAddress, {
      domain,
    });
  }
  return retVal;
}
