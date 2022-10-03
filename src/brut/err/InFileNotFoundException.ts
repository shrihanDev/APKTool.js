import AndrolibException from 'brut/AndrolibException';

export default class InFileNotFoundException extends AndrolibException {
  constructor(message?: string) {
    super('InFileNotFoundException', message);
  }
}
