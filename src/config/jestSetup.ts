import {isLive} from '../utils/helpers';
import nock from 'nock';

beforeAll(() => {
  if (!isLive()) {
    nock.disableNetConnect();
  }
});

afterAll(() => {
  nock.enableNetConnect();
})