import { ResolutionError, ResolutionErrorCode } from "../..";
import EnsProvider, { FourBytes } from "../../provider/provider";
import BaseConnection from "../../baseConnection";
import {defaultAbiCoder as AbiCoder} from 'ethers/utils/abi-coder';

/** Contract class describes the smartContract on the etherium */
export default class Contract extends BaseConnection {
  readonly contractInterface: [any];
  readonly address: string;
  readonly provider: EnsProvider;

  /**
   * @param contractInterface JSON-RPC interface of smartContract
   * @param address Contract's address
   */
  constructor(contractInterface, address: string) {
    super();
    this.contractInterface = contractInterface;
    this.address = address;
    this.provider = EnsProvider.getInstance();
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
    if (!methodDescription)
      throw new ResolutionError(ResolutionErrorCode.IncorrectResolverInterface, {method: this.provider.namingService});
    const functionName: string = methodDescription.name;
    const functionInputTypes: [string] = methodDescription.inputs.map(input => input.type);
    const methodSignature: string = `${functionName}(${functionInputTypes.join(',')})`;
    const initialBytes: FourBytes = this.provider.FourBytesHash(methodSignature);
    const dataParam: string = initialBytes + AbiCoder.encode(methodDescription.inputs, args).replace('0x', '');
    const response = await this.fetch(this.provider.url, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
          {
            data: dataParam,
            to: this.address
          },
          "latest"
        ],
      }),
      headers: {
        'Content-Type': 'application/json',
      }
    }).then(res => res.json());
    return AbiCoder.decode( methodDescription.outputs , response.result )[0];
  }
}