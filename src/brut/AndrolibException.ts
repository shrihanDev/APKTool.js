import BrutException from 'common/BrutException';

export default class AndrolibException extends BrutException {
  constructor(prefix: string, message?: string) {
    super(`${prefix}${message ? `:${message}` : ''}`);
  }
}
