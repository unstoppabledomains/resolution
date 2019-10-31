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
  UnspecifiedCurrency: (params: { domain: string; currencyTicker: string }) =>
    `${params.domain} has no ${params.currencyTicker} attached to it`,
  BlockchainDown: (params: { method: string }) =>
    `${params.method} blockchain is down at the moment`,
};

/**
 * Resolution Error class is designed to control every error being thrown by Namicorn
 * @param code - Error Code
 * - UnsupportedDomain - domain is not supported by current namicorn instance
 * - BlockchainDown - blockchain API is down
 * - UnregisteredDomain - domain is not owned by any address
 * - UnspecifiedResolver - domain has no resolver specified
 * - UnspecifiedCurrency - domain resolver doesn't have any address of specified currency
 * @param domain - Domain name that was being used
 * @param method
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
