import BrutException from 'common/BrutException';

export default class AndrolibException extends BrutException {
  constructor(message: string) {
    super(message);
  }
}
