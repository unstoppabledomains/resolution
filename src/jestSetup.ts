import nock from 'nock';
import {isLive} from './tests/helpers';

if (!isLive()) {
  nock.disableNetConnect()
}
