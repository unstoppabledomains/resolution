import ResolutionError, {ResolutionErrorCode} from "../errors/resolutionError";

export function prepareDomain(domain: string): string {
  const retVal: string = domain ? domain.trim().toLowerCase() : '';
  if(!RegExp('^[.a-z\\d-]+$').test(retVal)){
    throw new ResolutionError(ResolutionErrorCode.InvalidDomainAddress, {
      domain,
    });
  }
  return retVal;
}