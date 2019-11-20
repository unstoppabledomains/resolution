import { ResolutionError } from "../..";
import EnsProvider, { FourBytes } from "../../provider/provider";
import BaseConnection from "../../baseConnection";


export default class Contract extends BaseConnection {
  readonly contractInterface: [any];
  readonly address: string;
  readonly provider: EnsProvider;

  constructor(contractInterface, address) {
    super();
    this.contractInterface = contractInterface;
    this.address = address;
    this.provider = EnsProvider.getInstance();
  }

  //? Not sure what should I do with overloaded functions like addr....
  //! params first arg is always nodehash
  async fetchMethod(method: string, params: any[]) {
    const methodDescription = this.contractInterface.find(
      param =>
        param.name === method &&
        param.inputs.length === params.length
    );
    console.log(this.contractInterface);
    // if (!methodDescription)
    //   throw new ResolutionError('IncorrectResolverInterface', {method: this.provider.namingService});
    const functionName = methodDescription.name;
    const functionInputTypes = methodDescription.inputs.map(input => input.type) as [string];
    const methodSignature = `${functionName}(${functionInputTypes.join(', ')})`;
    console.log({methodSignature});
    
    const initialBytes: FourBytes = '0x' + this.provider.FourBytesHash(methodSignature);

    console.log({initialBytes});
    
    const dataParam = initialBytes + params[0].replace('0x', '');
    console.log({dataParam});
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
    }
    ).then(res => res.json());
    return response.result;
  }
}