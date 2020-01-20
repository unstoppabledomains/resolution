import BaseConnection from "../baseConnection";
import { defaultAbiCoder as AbiCoder } from './abicoder';
var keccak256 = require('js-sha3').keccak_256;
import ResolutionError, { ResolutionErrorCode } from "../resolutionError";
import { isNullAddress, NamingServiceName } from "../types";

type FourBytes = string;

/** @internal */
export default class Contract extends BaseConnection {
  readonly contractInterface: [any];
  readonly address: string;
  readonly url: string;
  readonly name: NamingServiceName;

  /**
   * @param contractInterface JSON-RPC interface of smartContract
   * @param address Contract's address
   */
  constructor(name: NamingServiceName, url: string, contractInterface, address: string) {
    super();
    this.name = name;
    this.url = url;
    this.contractInterface = contractInterface;
    this.address = address;
  }

  /**
   * Used to fetch a Contract method
   * @param method - method name
   * @param args - method args
   * @async
   */
  async fetchMethod(method: string, args: string[]): Promise<any> {
    const methodDescription = this.contractInterface.find(
      param =>
        param.name === method &&
        param.inputs.length === args.length
    );
    const inputParam = this.encodeInput(methodDescription, args);
    const response = await this.fetchData(inputParam);
    if (response.error) {
      throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, { method: this.name })
    }
    if (isNullAddress(response.result))
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, { recordName: method, domain: args[0] });
    const decoded = AbiCoder.decode(methodDescription.outputs, response.result)[0];
    return decoded
  }

  /**
* This method is used to get the first 4 bytes of keccak256 hash of contract method signature.
* required to make an appropriate read call to eth
* @param method - method signature to hash
* @returns a string that consist with 0x and 4 bytes in hex.
*/
  private fourBytesHash(method: string): FourBytes {
    return '0x' + keccak256(method).toString('hex').slice(0, 8);
  }

  private encodeInput(methodDescription, args): string {
    const functionName: string = methodDescription.name;
    const functionInputTypes: [string] = methodDescription.inputs.map(input => input.type);
    const methodSignature: string = `${functionName}(${functionInputTypes.join(',')})`;
    const initialBytes: FourBytes = this.fourBytesHash(methodSignature);
    return initialBytes + AbiCoder.encode(methodDescription.inputs, args).replace('0x', '');
  }

  private async fetchData(data: string): Promise<any> {
    const response = await this.fetch(this.url, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
          {
            data,
            to: this.address
          },
          "latest"
        ],
      }),
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return await response.json();
  }
}
