import BrutException from 'common/BrutException';

export default class RootUnknownFileException extends BrutException {
  constructor (message: string) {
    super(message);
  }
}
