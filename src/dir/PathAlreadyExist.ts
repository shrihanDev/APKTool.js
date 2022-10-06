import DirectoryException from './DirectoryException';

export default class PathAlreadyExists extends DirectoryException {
  protected static readonly serialVersionUID: BigInt = 3776428251424428904n;
  constructor(message: string) {
    super(message);
  }
}
