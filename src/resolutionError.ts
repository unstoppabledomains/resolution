/** Alias for Resolution Error code */
type ErrorCode = keyof typeof HandlersByCode;
/** Alias for Resolution error handler function */
type ResolutionErrorHandler = (error: ResolutionErrorOptions) => string;
/** Explains Resolution Error options */
type ResolutionErrorOptions = {
  method?: string;
  domain?: string;
  currencyTicker?: string;
};
/**
 * @ignore
 * Internal Mapping object from ResolutionErrorCode to a ResolutionErrorHandler
 */
const HandlersByCode = {
  UnregisteredDomain: (params: { domain: string }) =>
    `Domain ${params.domain} is not registered`,
  UnspecifiedResolver: () => 'Resolver address is not specified',
  UnsupportedDomain: (params: { domain: string }) =>
    `Domain ${params.domain} is not supported`,
  UnregisteredCurrency: (params: { domain: string; currencyTicker: string }) =>
    `${params.domain} has no ${params.currencyTicker} attached to it`,
  BlockchainDown: (params: { method: string }) =>
    `${params.method} blockchain is down at the moment`,
};

/**
 * Resolution Error class is designed to control every error being thrown by Namicorn
 * @param code - Error Code
 * @param domain - Domain name that was being used
 * @param method
 * @throws UnregisteredDomain - when domain is not registered
 * @throws UnspecifiedResolver - when resolver is not specified
 * @throws UnsupportedDomain - when domain is not supported by current namicorn instance
 * @throws UnregisteredCurrency - when domain doesn't have any address of specified currency
 * @throws BlockchainDown - when blockchain is down
 */
export default class ResolutionError extends Error {
  readonly code: ErrorCode;
  readonly domain?: string;
  readonly method?: string;
  readonly currencyTicker?: string;

  constructor(code: ErrorCode, options: ResolutionErrorOptions) {
    const resolutionErrorHandler: ResolutionErrorHandler = HandlersByCode[code];
    const { domain, method, currencyTicker } = options;
    super(resolutionErrorHandler({ domain, method, currencyTicker }));
    this.code = code;
    this.domain = domain;
    this.method = method;
    this.currencyTicker = currencyTicker;
    this.name = 'ResolutionError';
    Object.setPrototypeOf(this, ResolutionError.prototype);
  }
}
