import {
  ResolutionMethod,
  UnsLocation,
  ResolutionConfig,
} from '../types/publicTypes';

/**
 * Alias for Resolution error handler function
 * @internal
 */
type ResolutionErrorHandler = (error: ResolutionErrorOptions) => string;
/** Explains Resolution Error options */
type ResolutionErrorOptions = {
  providerMessage?: string;
  errorMessage?: string;
  method?: ResolutionMethod;
  methodName?: string;
  domain?: string;
  currencyTicker?: string;
  recordName?: string;
  namingService?: string;
  location?: UnsLocation;
  tokenUri?: string;
  config?: ResolutionConfig;
};

export enum ResolutionErrorCode {
  UnregisteredDomain = 'UnregisteredDomain',
  UnspecifiedResolver = 'UnspecifiedResolver',
  UnsupportedDomain = 'UnsupportedDomain',
  UnsupportedService = 'UnsupportedService',
  UnsupportedMethod = 'UnsupportedMethod',
  UnspecifiedCurrency = 'UnspecifiedCurrency',
  UnsupportedCurrency = 'UnsupportedCurrency',
  IncorrectResolverInterface = 'IncorrectResolverInterface',
  RecordNotFound = 'RecordNotFound',
  MetadataEndpointError = 'MetadataEndpointError',
  ServiceProviderError = 'ServiceProviderError',
  InvalidTwitterVerification = 'InvalidTwitterVerification',
  InconsistentDomainArray = 'InconsistentDomainArray',
  InvalidDomainAddress = 'InvalidDomainAddress',
  InvalidUnsResolutionConfiguration = 'InvalidResolutionConfiguration',
}

/**
 * @internal
 * Internal Mapping object from ResolutionErrorCode to a ResolutionErrorHandler
 */
const HandlersByCode = {
  [ResolutionErrorCode.UnregisteredDomain]: (params: {domain: string}) =>
    `Domain ${params.domain} is not registered`,
  [ResolutionErrorCode.UnspecifiedResolver]: (params: {
    domain: string;
    location?: UnsLocation;
  }) =>
    `${params.location ? `${params.location}: ` : ''}Domain ${
      params.domain
    } is not configured`,
  [ResolutionErrorCode.UnsupportedDomain]: (params: {domain: string}) =>
    `Domain ${params.domain} is not supported`,
  [ResolutionErrorCode.UnsupportedMethod]: (params: {
    methodName: string;
    domain: string;
  }) => {
    // We normally expect a domain name, but in can be absent in the tests.
    const zilHelp = params.domain?.endsWith('.zil')
      ? " (if this method was called via the Resolution class with both UNS and ZNS providers configured not in the API mode, this error also means that the domain doesn't exist in UNS)"
      : '';
    return `Method ${params.methodName} is not supported for ${params.domain}${zilHelp}`;
  },

  [ResolutionErrorCode.InvalidTwitterVerification]: (params: {
    domain?: string;
    location?: UnsLocation;
  }) =>
    `${params.location ? `${params.location}: ` : ''}Domain ${
      params.domain
    } has invalid Twitter signature verification`,
  [ResolutionErrorCode.UnsupportedCurrency]: (params: {
    currencyTicker: string;
  }) => `${params.currencyTicker} is not supported`,
  [ResolutionErrorCode.IncorrectResolverInterface]: (params: {
    method: ResolutionMethod;
  }) => `Domain resolver is configured incorrectly for ${params.method}`,
  [ResolutionErrorCode.RecordNotFound]: (params: {
    recordName: string;
    domain: string;
    location?: UnsLocation;
  }) =>
    `${params.location ? `${params.location}: ` : ''}No ${
      params.recordName
    } record found for ${params.domain}`,
  [ResolutionErrorCode.ServiceProviderError]: (params: {
    providerMessage?: string;
  }) => `< ${params.providerMessage} >`,
  [ResolutionErrorCode.MetadataEndpointError]: (params: {
    tokenUri: string;
    errorMessage: string;
  }) =>
    `Failed to query tokenUri ${params.tokenUri}. Error: ${params.errorMessage}`,
  [ResolutionErrorCode.UnsupportedService]: (params: {namingService: string}) =>
    `Naming service ${params.namingService} is not supported`,
  [ResolutionErrorCode.InvalidDomainAddress]: (params: {domain: string}) =>
    `Domain address ${params.domain} is invalid`,
  [ResolutionErrorCode.InvalidUnsResolutionConfiguration]: (params: {
    config: any;
  }) => `Resolution `,
};

/**
 * Resolution Error class is designed to control every error being thrown by Resolution
 * @param code - Error Code
 * - UnsupportedDomain - domain is not supported by current Resolution instance
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
    const {domain, method, currencyTicker} = options;
    const message = resolutionErrorHandler(options);

    super(message);
    this.code = code;
    this.domain = domain;
    this.method = method;
    this.currencyTicker = currencyTicker;
    this.name = 'ResolutionError';
    Object.setPrototypeOf(this, ResolutionError.prototype);
  }
}

export default ResolutionError;
