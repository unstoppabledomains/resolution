import { ResolutionMethod } from '../types';
import Resolution from '../Resolution';
/** Alias for Resolution error handler function */
type ResolutionErrorHandler = (error: ResolutionErrorOptions) => string;
/** Explains Resolution Error options */
type ResolutionErrorOptions = {
  method?: ResolutionMethod;
  domain?: string;
  currencyTicker?: string;
  recordName?: string;
};

export enum ResolutionErrorCode {
  UnregisteredDomain = 'UnregisteredDomain',
  UnspecifiedResolver = 'UnspecifiedResolver',
  UnsupportedDomain = 'UnsupportedDomain',
  UnspecifiedCurrency = 'UnspecifiedCurrency',
  NamingServiceDown = 'NamingServiceDown',
  UnsupportedCurrency = 'UnsupportedCurrency',
  IncorrectResolverInterface = 'IncorrectResolverInterface',
  RecordNotFound = 'RecordNotFound',
  UnsupportedMethod = 'UnsupportedMethod'
}

/**
 * @internal
 * Internal Mapping object from ResolutionErrorCode to a ResolutionErrorHandler
 */
const HandlersByCode = {
  [ResolutionErrorCode.UnregisteredDomain]: (params: { domain: string }) =>
    `Domain ${params.domain} is not registered`,
  [ResolutionErrorCode.UnspecifiedResolver]: (params: { domain: string }) =>
    `Domain ${params.domain} is not configured`,
  [ResolutionErrorCode.UnsupportedDomain]: (params: { domain: string }) =>
    `Domain ${params.domain} is not supported`,
  [ResolutionErrorCode.UnspecifiedCurrency]: (params: {
    domain: string;
    currencyTicker: string;
  }) =>
    `Domain ${params.domain} has no ${params.currencyTicker} attached to it`,
  [ResolutionErrorCode.NamingServiceDown]: (params: {
    method: ResolutionMethod;
  }) => `${params.method} naming service is down at the moment`,
  [ResolutionErrorCode.UnsupportedCurrency]: (params: {
    currencyTicker: string;
  }) => `${params.currencyTicker} is not supported`,
  [ResolutionErrorCode.IncorrectResolverInterface]: (params: {
    method: ResolutionMethod;
  }) => `Domain resolver is configured incorrectly for ${params.method}`,
  [ResolutionErrorCode.RecordNotFound]: (params: {
    recordName: string;
    domain: string;
  }) => `No ${params.recordName} record found for ${params.domain}`,
  [ResolutionErrorCode.UnsupportedMethod]: (params: {
    method: ResolutionMethod
  }) => `This method is not support for ${params.method}`
};

/**
 * Resolution Error class is designed to control every error being thrown by Resolution
 * @param code - Error Code
 * - UnsupportedDomain - domain is not supported by current Resolution instance
 * - NamingServiceDown - blockchain API is down
 * - UnregisteredDomain - domain is not owned by any address
 * - UnspecifiedResolver - domain has no resolver specified
 * - UnspecifiedCurrency - domain resolver doesn't have any address of specified currency
 * - UnsupportedCurrency - currency is not supported
 * - IncorrectResolverInterface - ResolverInterface is incorrected
 * - RecordNotFound - No record was found
 * @param domain - Domain name that was being used
 * @param method
 */
export class ResolutionError extends Error {
  readonly code: ResolutionErrorCode;
  readonly domain?: string;
  readonly method?: string;
  readonly currencyTicker?: string;

  constructor(code: ResolutionErrorCode, options: ResolutionErrorOptions = {}) {
    const resolutionErrorHandler: ResolutionErrorHandler = HandlersByCode[code];
    super(resolutionErrorHandler(options));
    this.code = code;
    this.domain = options.domain;
    this.method = options.method;
    this.currencyTicker = options.currencyTicker;
    this.name = 'ResolutionError';
    Object.setPrototypeOf(this, ResolutionError.prototype);
  }
}
export default ResolutionError;
