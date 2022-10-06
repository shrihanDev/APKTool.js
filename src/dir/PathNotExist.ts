import DirectoryException from './DirectoryException';

export default class PathNotExists extends DirectoryException {
  protected static readonly serialVersionUID: BigInt = -6949242015506342032n;
  constructor(message: string) {
    super(message);
  }
}
