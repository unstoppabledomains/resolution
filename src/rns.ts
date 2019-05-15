import Ens from './ens';

const DEFAULT_SOURCE = 'https://public-node.rsk.co';
export default class Rns extends Ens {
  constructor(source: string | boolean = DEFAULT_SOURCE) {
    if (source == true) {
      source = DEFAULT_SOURCE;
    }
    super(source);
  }
}
