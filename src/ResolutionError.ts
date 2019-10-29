/** Alias for Resolution Error code */
type ResolutionErrorCode = string;
/** Alias for Resolution error handler function */
// type ResolutionErrorHandler = (domain?: string, method?: string) => string;
type ResolutionErrorHandler = (error: ResolutionErrorOptions) => string;
type ResolutionErrorOptions = {
  method?: string;
  domain?: string;
  currencyTicker?: string;
};
/**
 * @ignore
 * Internal Mapping object from ResolutionErrorCode to a ResolutionErrorHandler
 */
const HandlersByCode: { [key: string]: ResolutionErrorHandler } = {
  UNREGISTERED_DOMAIN: (error: { domain: string }) =>
    `Domain ${error.domain} is not registered`,
  UNSPECIFIED_RESOLVER: () => 'Resolver address is not specified',
  UNSUPPORTED_DOMAIN: (error: { domain: string }) =>
    `Domain ${error.domain} is not supported`,
  NOT_REGISTERED_CURRENCY: (error: {
    domain: string;
    currencyTicker: string;
  }) => `${error.domain} has no ${error.currencyTicker} attached to it`,
  UNSPECIFIED_NETWORK: (error: { method: string }) =>
    `Unspecified network in Namicorn ${error.method} configuration`,
  UNSPECIFIED_URL: (error: { method: string }) =>
    `Unspecified url in Namicorn ${error.method} configuration`,
  BLOCKCHAIN_DOWN: (error: { method: string }) =>
    `${error.method} blockchain is down at the moment`,
};

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
  readonly currencyTicker?: string;

  constructor(code: ResolutionErrorCode, options: ResolutionErrorOptions) {
    const resolutionErrorHandler: ResolutionErrorHandler = HandlersByCode[code];
    const { domain, method, currencyTicker } = options;
    super(resolutionErrorHandler({ domain, method, currencyTicker }));
    this.code = code;
    this.domain = domain;
    this.method = method;
    this.currencyTicker = currencyTicker;
    this.name = 'ResolutionError';
  }
}
