import {Provider} from '../types/publicTypes';
import EthereumContract from '../contracts/EthereumContract';
import {RequestArguments} from '../types';
import {Interface} from '@ethersproject/abi';
import mocks from './testData/mockData.json';

class TestProvider implements Provider {
  request: (request: RequestArguments) => Promise<unknown>;
}

describe('EthereumContract', () => {
  let testContract: EthereumContract;
  let testProvider: TestProvider;
  const mockData = mocks['ethereum_contract_test'];

  beforeEach(() => {
    testProvider = new TestProvider();
    testContract = new EthereumContract(
      mockData.testAbi,
      'test-address',
      testProvider,
    );
  });

  it('can call the contract', async () => {
    testProvider.request = jest.fn().mockReturnValue(mockData.callReturn);

    const result = await testContract.call('getValue', ['1']);
    expect(testProvider.request).toHaveBeenCalledWith(mockData.callParam);
    expect(result).toContain('test return value');
  });

  it('can multicall the contract', async () => {
    testProvider.request = jest.fn().mockReturnValue(mockData.multicallReturn);

    const result = await testContract.multicall([
      {method: 'getValue', args: ['1']},
      {method: 'getValue', args: ['2']},
    ]);
    expect(testProvider.request).toHaveBeenCalledWith(mockData.multicallParam);
    expect(result.length).toEqual(2);
    expect(result[0]).toContain('test value');
    expect(result[1]).toContain('test value 2');
  });

  it('can fetch contract logs', async () => {
    testProvider.request = jest.fn().mockReturnValue(mockData.getlogsReturn);

    const result = await testContract.fetchLogs(
      'testEvent',
      '0x000000000000000000000000000000000000000000000000000000000000001',
      'earliest',
    );
    expect(testProvider.request).toHaveBeenCalledWith(mockData.getlogsParam);
    const decoded = Interface.getAbiCoder().decode(['string'], result[0].data);
    expect(decoded).toContain('test return value');
  });
});
