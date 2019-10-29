/** Alias for Resolution Error code */
type ErrorCode = keyof typeof HandlersByCode;
/** Alias for Resolution error handler function */
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
  UnregisteredDomain: (error: { domain: string }) =>
    `Domain ${error.domain} is not registered`,
  UnspecifiedResolver: () => 'Resolver address is not specified',
  UnsupportedDomain: (error: { domain: string }) =>
    `Domain ${error.domain} is not supported`,
  NotRegisteredCurrency: (error: {
    domain: string;
    currencyTicker: string;
  }) => `${error.domain} has no ${error.currencyTicker} attached to it`,
  UnspecifiedNetwork: (error: { method: string }) =>
    `Unspecified network in Namicorn ${error.method} configuration`,
  UnspecifiedUrl: (error: { method: string }) =>
    `Unspecified url in Namicorn ${error.method} configuration`,
  BlockchainDown: (error: { method: string }) =>
    `${error.method} blockchain is down at the moment`,
};

/**
 * Resolution Error class is designed to control every error being thrown by Namicorn
 * @param code - Error Code
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
  }
}
