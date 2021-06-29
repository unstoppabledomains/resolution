import {ResolutionMethod} from '../types/publicTypes';
/** Alias for Resolution error handler function
 * @internal
 */
type ConfigurationErrorHandler = (error: ConfigurationErrorOptions) => string;
/** Explains Resolution Error options */
type ConfigurationErrorOptions = {
  method?: ResolutionMethod;
  dependency?: string;
  config?: string;
  field?: string;
  version?: string;
};

export enum ConfigurationErrorCode {
  IncorrectProvider = 'IncorrectProvider',
  UnsupportedNetwork = 'UnsupportedNetwork',
  UnspecifiedUrl = 'UnspecifiedUrl',
  DependencyMissing = 'DependencyMissing',
  CustomNetworkConfigMissing = 'CustomNetworkConfigMissing',
  InvalidConfigurationField = 'InvalidProxyReader',
}

/**
 * @internal
 * Internal Mapping object from ConfigurationErrorCode to a ConfigurationErrorHandler
 */
const HandlersByCode = {
  [ConfigurationErrorCode.IncorrectProvider]: () =>
    "Provider doesn't implement sendAsync or send method",
  [ConfigurationErrorCode.UnsupportedNetwork]: (params: {
    method: ResolutionMethod;
  }) =>
    `Unsupported network in Resolution ${params.method || ''} configuration`,
  [ConfigurationErrorCode.UnspecifiedUrl]: (params: {
    method: ResolutionMethod;
  }) => `Unspecified url in Resolution ${params.method} configuration`,
  [ConfigurationErrorCode.DependencyMissing]: (params: {
    dependency: string;
    version: string;
  }) =>
    `Missing dependency for this functionality. Please install ${params.dependency} @ ${params.version} via npm or yarn`,
  [ConfigurationErrorCode.CustomNetworkConfigMissing]: (params: {
    method: ResolutionMethod;
    config: string;
  }) =>
    `Missing configuration in Resolution ${params.method}. Please specify ${params.config} when using a custom network`,
  [ConfigurationErrorCode.InvalidConfigurationField]: (params: {
    method: ResolutionMethod;
    field: string;
  }) => `Invalid '${params.field}' in Resolution ${params.method}`,
};

/**
 * Configuration Error class is designed to control every error being thrown by wrong configurations for objects
 * @param code - Error Code
 * - IncorrectProvider - When provider doesn't have implemented send or sendAsync methods
 * - UnsupportedNetwork - When network is not specified or not supported
 * - UnspecifiedUrl - When url is not specified for custom naming service configurations
 * - CustomNetworkConfigMissing - When configuration is missing for custom network configurations
 * @param method - optional param to specify which namingService errored out
 */
export class ConfigurationError extends Error {
  readonly code: ConfigurationErrorCode;
  readonly method?: string;

  constructor(
    code: ConfigurationErrorCode,
    options: ConfigurationErrorOptions = {},
  ) {
    const configurationErrorHandler: ConfigurationErrorHandler =
      HandlersByCode[code];
    super(configurationErrorHandler(options));
    this.code = code;
    this.method = options.method;
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}
export default ConfigurationError;
