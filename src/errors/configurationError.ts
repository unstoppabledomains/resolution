import { ResolutionMethod } from '../types';
/** Alias for Resolution error handler function */
type ConfigurationErrorHandler = (error: ConfigurationErrorOptions) => string;
/** Explains Resolution Error options */
type ConfigurationErrorOptions = {
  method?: ResolutionMethod;
};

export enum ConfigurationErrorCode {
  IncorrectProvider = 'IncorrectProvider',
  UnspecifiedNetwork = "UnspecifiedNetwork",
  UnspecifiedUrl = "UnspecifiedUrl",
  MissingProviderConfigurations = "MissingProviderConfigurations"
}

/**
 * @internal
 * Internal Mapping object from ConfigurationErrorCode to a ConfigurationErrorHandler
 */
const HandlersByCode = {
  [ConfigurationErrorCode.IncorrectProvider]: (params: {}) => "Provider doesn't implement sendAsync or send method",
  [ConfigurationErrorCode.UnspecifiedNetwork]: (params: {method: ResolutionMethod}) => `Unspecified network in Resolution ${params.method} configuration`,
  [ConfigurationErrorCode.UnspecifiedUrl]: (params: {method: ResolutionMethod}) => `Unspecified url in Resolution ${params.method} configuration`,
  [ConfigurationErrorCode.MissingProviderConfigurations]: (params: {}) => `Couldn't find any configurations\n\tUse -C to configurate the library`
};

/**
 * Configuration Error class is designed to control every error being thrown by wrong configurations for objects
 * @param code - Error Code
 * - IncorrectProvider - When provider doesn't have implemented send or sendAsync methods
 * - UnspecifiedNetwork - When network is not specified for custom namingService configurations
 * - UnspecifiedUrl - When url is not specified for custom namingService configurations
 * @param method - optional param to specify which namingService errored out
 */
export class ConfigurationError extends Error {
  readonly code: ConfigurationErrorCode;
  readonly method?: string;


  constructor(code: ConfigurationErrorCode, options: ConfigurationErrorOptions = {}) {
    const ConfigurationErrorHandler: ConfigurationErrorHandler = HandlersByCode[code];
    const { method } = options;
    super(
      ConfigurationErrorHandler({ method }),
    );
    this.code = code;
    this.method = method;
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}
export default ConfigurationError;
