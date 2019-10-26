/** Alias for Resolution Error code */
type ResolutionErrorCode = string;
/** Alias for Resolution error handler function */
type ResolutionErrorHandler = (domain?: string, method?: string) => string;

/** 
 * @ignore 
 * Internal Mapping object from ResolutionErrorCode to a ResolutionErrorHandler 
*/
const HandlersByCode: {[key: string]: ResolutionErrorHandler} = {
  'UNREGISTERED_DOMAIN': (domain: string) => `Domain ${domain} is not registered`,
  'UNSPECIFIED_RESOLVER': () => 'Resolver address is incorrect',
  'UNSPECIFIED_NETWORK': (method: string) => `Unspecified network in Namicorn ${method} configuration`,
  'UNSPECIFIED_URL': (method: string) => `Unspecified url in Namicorn ${method} configuration`,
}

/**
 * Resolution Error class is designed to control every error being thrown by Namicorn
 * @param code - Error Code
 * @param domain - Domain name that was being used
 * @param method
 */
class ResolutionError extends Error {
 
  readonly code: ResolutionErrorCode;
  readonly domain?: string;
  readonly method?: string;

  constructor(code: ResolutionErrorCode, method?: string, domain?: string,) {
    const resolutionErrorHandler: ResolutionErrorHandler = HandlersByCode[code];
    super(resolutionErrorHandler(domain, method));
    this.code = code;
    this.domain = domain;
    this.method = method;
  } 
}