import {expectResolutionErrorCode} from './helpers';
import {prepareAndValidateDomain} from '../utils/prepareAndValidate';
import {ResolutionErrorCode} from '../errors/resolutionError';

it('should throw exception for invalid domains', async () => {
  await expectResolutionErrorCode(
    () => prepareAndValidateDomain('#hello@.blockchain'),
    ResolutionErrorCode.InvalidDomainAddress,
  );
  await expectResolutionErrorCode(
    () => prepareAndValidateDomain('hello123#.blockchain'),
    ResolutionErrorCode.InvalidDomainAddress,
  );
  await expectResolutionErrorCode(
    () => prepareAndValidateDomain('hello#blockchain'),
    ResolutionErrorCode.InvalidDomainAddress,
  );
  await expectResolutionErrorCode(
    () => prepareAndValidateDomain('helloblockchain#'),
    ResolutionErrorCode.InvalidDomainAddress,
  );
});

it('should convert domain name to lower case', async () => {
  expect(prepareAndValidateDomain('  HELLO.Blockchain  ')).toEqual(
    'hello.blockchain',
  );
  expect(prepareAndValidateDomain('  HELLO123.Blockchain  ')).toEqual(
    'hello123.blockchain',
  );
  expect(prepareAndValidateDomain('  HELLO1.Blockchain1  ')).toEqual(
    'hello1.blockchain1',
  );
});
