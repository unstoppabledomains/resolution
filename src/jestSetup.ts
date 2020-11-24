import {isLive} from './tests/helpers';
import nock from 'nock';

beforeAll(() => {
  if (!isLive()) {
    nock.disableNetConnect();
  }
});

afterAll(() => {
  nock.enableNetConnect();
})