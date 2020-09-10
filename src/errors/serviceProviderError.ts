/** Alias for ServiceProvider error handler function */
type ServiceProviderErrorHandler = (error: ServiceProviderErrorOptions) => string;
/** Explains ServiceProvider Error options */
type ServiceProviderErrorOptions = {
  providerName?: string
  providerMessage?: string;
};

export enum ServiceProviderErrorCode {
  GeneralError = 'GeneralError'
}

/**
 * @internal
 * Internal Mapping object from ServiceProviderErrorCode to a ServiceProviderErrorHandler
 */
const HandlersByCode = {
    [ServiceProviderErrorCode.GeneralError]: (params: {providerMessage, providerName}) => `${params.providerName}: ${params.providerMessage}`
};

/**
 * ServiceProviderError class is a wrapper on any errors that might happen from within the providers
 * @param code - Error Code
 * - BadLimit - some providers doesn't allow to traverse X amount of blocks to get event logs.
 */
export class ServiceProviderError extends Error {
  readonly code: ServiceProviderErrorCode;

  constructor(
    code: ServiceProviderErrorCode,
    options: ServiceProviderErrorOptions = {},
  ) {
    const ServiceProviderErrorHandler: ServiceProviderErrorHandler =
      HandlersByCode[code];
    super(ServiceProviderErrorHandler(options));
    this.code = code;
    this.name = 'ServiceProviderError';
    Object.setPrototypeOf(this, ServiceProviderError.prototype);
  }
}
export default ServiceProviderError;
