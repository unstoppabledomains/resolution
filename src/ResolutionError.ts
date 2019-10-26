/** Alias for Resolution Error code */
type ResolutionErrorCode = string;
/** Alias for Resolution error handler function */
// type ResolutionErrorHandler = (domain?: string, method?: string) => string;
type ResolutionErrorHandler = (error: {domain?: string, method?: string}) => string;

/** 
 * @ignore 
 * Internal Mapping object from ResolutionErrorCode to a ResolutionErrorHandler 
*/
const HandlersByCode: {[key: string]: ResolutionErrorHandler} = {
  'UNREGISTERED_DOMAIN': (error: {domain: string}) => `Domain ${error.domain} is not registered`,
  'UNSPECIFIED_RESOLVER': () => 'Resolver address is incorrect',
  'UNSPECIFIED_NETWORK': (error: {method: string}) => `Unspecified network in Namicorn ${error.method} configuration`,
  'UNSPECIFIED_URL': (error: {method: string}) => `Unspecified url in Namicorn ${error.method} configuration`,
}

/**
 * Resolution Error class is designed to control every error being thrown by Namicorn
 * @param code - Error Code
 * @param domain - Domain name that was being used
 * @param method
 */
export default class ResolutionError extends Error {
 
  readonly code: ResolutionErrorCode;
  readonly domain?: string;
  readonly method?: string;

  constructor(code: ResolutionErrorCode, method?: string, domain?: string,) {
    const resolutionErrorHandler: ResolutionErrorHandler = HandlersByCode[code];
    super(resolutionErrorHandler({domain, method}));
    this.code = code;
    this.domain = domain;
    this.method = method;
  } 
}
