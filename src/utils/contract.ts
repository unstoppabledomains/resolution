import BaseConnection from "../baseConnection";
import abi from 'ethereumjs-abi';
import ResolutionError, { ResolutionErrorCode } from "../resolutionError";
import { isNullAddress, NamingServiceName } from "../types";

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
    const encodedInput = this.encodeInput(methodDescription, args);
    const response = await this.fetchData(encodedInput);
    if (response.error)
      throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, { method: this.name })
    if (isNullAddress(response.result))
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, { recordName: method, domain: args[0] });
    return this.decodeOutput(methodDescription, response.result);
  }

  private decodeOutput(methodDescription, data):string {
    const output = Buffer.from(data.replace('0x', ''), 'hex');
    const outputTypes = methodDescription.outputs.map((output: { type: string; }) => output.type);
    let newDecoded = abi.rawDecode(outputTypes, output)[0];

    if (newDecoded && outputTypes[0] === 'address' || outputTypes[0] === 'bytes') {
      return '0x' + newDecoded.toString('hex');
    } else {
      return newDecoded.toString();
    }
  }

  private encodeInput(methodDescription, args):string {
    const functionName: string = methodDescription.name;
    const functionInputTypes: string[] = methodDescription.inputs.map((input: { type: string; }) => input.type);
    const methodID = '0x' + abi.methodID(functionName, functionInputTypes).toString('hex');
    return methodID + abi.rawEncode(functionInputTypes, args).toString('hex');
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
