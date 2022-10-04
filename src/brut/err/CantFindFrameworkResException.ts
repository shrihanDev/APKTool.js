import AndrolibException from 'brut/AndrolibException';

export default class CantFindFrameworkResException extends AndrolibException {
  constructor(message: string) {
    super(message);
  }
}
