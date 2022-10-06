import BrutException from 'common/BrutException';

export default class DirectoryException extends BrutException {
  protected static readonly serialVersionUID: BigInt = -8871963042836625387n;
  constructor(message?: string) {
    super(message);
  }
}
