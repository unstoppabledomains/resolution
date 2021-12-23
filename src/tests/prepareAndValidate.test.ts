import {expectResolutionErrorCode} from "./helpers";
import {prepareAndValidateDomain} from "../utils/prepareAndValidate";
import {ResolutionErrorCode} from "../errors/resolutionError";

it('should throw exception for invalid domains', async () => {
  await expectResolutionErrorCode(
    () => prepareAndValidateDomain('hello.blockchain@#'),
    ResolutionErrorCode.InvalidDomainAddress,
  );
});

it('should throw exception for invalid domains', async () => {
  await expectResolutionErrorCode(
    () => prepareAndValidateDomain('hello@.blockchain'),
    ResolutionErrorCode.InvalidDomainAddress,
  );
});

it('should throw exception for invalid domains', async () => {
  await expectResolutionErrorCode(
    () => prepareAndValidateDomain('hello$blockchain'),
    ResolutionErrorCode.InvalidDomainAddress,
  );
});

it('should convert domain name to lower case', async () => {
  expect(prepareAndValidateDomain('  HELLO.Blockchain  ')).toEqual('hello.blockchain');
});